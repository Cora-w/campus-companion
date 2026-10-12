CREATE TABLE app.shop_permissions (
 user_id uuid PRIMARY KEY,school_id text NOT NULL REFERENCES app.schools(id),
 enabled boolean NOT NULL DEFAULT false,granted_by uuid NOT NULL REFERENCES app.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(user_id,school_id) REFERENCES app.school_memberships(user_id,school_id)
);
ALTER TABLE app.shop_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.shop_permissions FORCE ROW LEVEL SECURITY;
GRANT SELECT ON app.shop_permissions TO app_backend;
CREATE POLICY shop_permission_read ON app.shop_permissions FOR SELECT TO app_backend USING(app.school_admin(school_id) OR (user_id=app.current_user_id() AND school_id=app.request_school()));
ALTER TABLE app.stores ADD COLUMN school_id text REFERENCES app.schools(id),
 ADD COLUMN student_owned boolean NOT NULL DEFAULT false,
 ADD COLUMN is_open boolean NOT NULL DEFAULT true,ADD COLUMN admin_suspended boolean NOT NULL DEFAULT false,
 ADD COLUMN opening_hours text NOT NULL DEFAULT '', ADD COLUMN avatar text NOT NULL DEFAULT '',
 ADD COLUMN tagline text NOT NULL DEFAULT '', ADD COLUMN color text NOT NULL DEFAULT '',
 ADD COLUMN version bigint NOT NULL DEFAULT 1,
 ADD CONSTRAINT student_store_owner CHECK(NOT student_owned OR (owner_id IS NOT NULL AND school_id IS NOT NULL));
CREATE UNIQUE INDEX student_one_shop ON app.stores(owner_id) WHERE student_owned;
ALTER TABLE app.products ADD COLUMN category text NOT NULL DEFAULT '',ADD COLUMN unit text NOT NULL DEFAULT '',
 ADD COLUMN icon text NOT NULL DEFAULT '',ADD COLUMN color text NOT NULL DEFAULT '';
CREATE FUNCTION app.has_shop_permission(target uuid,school text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM app.shop_permissions p JOIN app.users u ON u.id=p.user_id
 WHERE p.user_id=target AND p.school_id=school AND p.enabled AND u.status='active' AND u.role='student')
$$;
CREATE FUNCTION app.store_accepting_orders(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM app.stores s WHERE s.id=target AND s.status='open' AND s.is_open AND NOT s.admin_suspended
 AND (NOT s.student_owned OR app.has_shop_permission(s.owner_id,s.school_id)))
$$;
REVOKE ALL ON FUNCTION app.has_shop_permission(uuid,text),app.store_accepting_orders(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.has_shop_permission(uuid,text),app.store_accepting_orders(uuid) TO app_backend,app_agent;
CREATE OR REPLACE FUNCTION app.request_store_staff(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT app.request_verified() AND EXISTS(SELECT 1 FROM app.stores s WHERE s.id=target AND
 ((s.student_owned AND s.school_id=app.request_school() AND s.owner_id=app.current_user_id() AND app.has_shop_permission(s.owner_id,s.school_id))
 OR (NOT s.student_owned AND (s.school_id IS NULL OR s.school_id=app.request_school()) AND
 (s.owner_id=app.current_user_id() OR EXISTS(SELECT 1 FROM app.store_staff f WHERE f.store_id=s.id AND f.user_id=app.current_user_id() AND f.active)))))
$$;
CREATE FUNCTION app.admin_shop_permission(target uuid,enabled_value boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE school text:=app.request_school();
BEGIN
 IF NOT app.school_admin(school) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501';END IF;
 PERFORM 1 FROM app.users u JOIN app.school_memberships m ON m.user_id=u.id
 WHERE u.id=target AND m.school_id=school AND (NOT enabled_value OR (u.role='student' AND u.status='active')) FOR UPDATE OF u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Eligible same school account required' USING ERRCODE='42501';END IF;
 INSERT INTO app.shop_permissions(user_id,school_id,enabled,granted_by) VALUES(target,school,enabled_value,app.current_user_id())
 ON CONFLICT(user_id) DO UPDATE SET enabled=EXCLUDED.enabled,granted_by=EXCLUDED.granted_by,updated_at=now();
 PERFORM app.staff_audit('shop.permission_changed','user',target::text);
END $$;
CREATE FUNCTION app.admin_suspend_shop(target uuid,expected bigint,suspended boolean) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE s app.stores;
BEGIN
 SELECT * INTO s FROM app.stores WHERE id=target FOR UPDATE;
 IF NOT FOUND OR NOT app.school_admin(s.school_id) THEN RAISE EXCEPTION 'Same school administrator required' USING ERRCODE='42501';END IF;
 IF expected IS NULL OR s.version<>expected THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001';END IF;
 UPDATE app.stores SET admin_suspended=suspended,version=version+1 WHERE id=target;
 PERFORM app.staff_audit('shop.moderated','store',target::text);RETURN expected+1;
END $$;
-- Explicit field lists prevent owner requests changing school, owner or suspension.
CREATE FUNCTION app.save_student_shop(target uuid,expected bigint,shop_name text,shop_location text,hours text,tag text,open_value boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE school text:=app.request_school();s app.stores;result uuid;
BEGIN
 PERFORM 1 FROM app.users WHERE id=app.current_user_id() FOR UPDATE;
 IF app.request_role() IS DISTINCT FROM 'student' OR NOT app.request_verified() OR NOT app.has_shop_permission(app.current_user_id(),school) THEN RAISE EXCEPTION 'Shop permission required' USING ERRCODE='42501';END IF;
 IF shop_name IS NULL OR shop_location IS NULL OR hours IS NULL OR length(btrim(shop_name)) NOT BETWEEN 1 AND 24 OR length(btrim(shop_location)) NOT BETWEEN 1 AND 80 OR length(btrim(hours)) NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Invalid shop details' USING ERRCODE='23514';END IF;
 IF target IS NULL THEN
 INSERT INTO app.stores(name,store_type,location,owner_id,school_id,student_owned,is_open,opening_hours,tagline,avatar)
 VALUES(shop_name,'campus_store',shop_location,app.current_user_id(),school,true,open_value,hours,coalesce(tag,''),left(shop_name,1)) RETURNING id INTO result;
 ELSE
 SELECT * INTO s FROM app.stores WHERE id=target AND student_owned AND owner_id=app.current_user_id() AND school_id=school FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Own shop required' USING ERRCODE='42501';END IF;
 IF expected IS NULL OR s.version<>expected THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001';END IF;
 UPDATE app.stores SET name=shop_name,location=shop_location,opening_hours=hours,tagline=coalesce(tag,''),avatar=left(shop_name,1),
 is_open=CASE WHEN s.admin_suspended THEN s.is_open ELSE open_value END,version=version+1 WHERE id=target;result:=target;
 END IF;RETURN result;
END $$;
REVOKE ALL ON FUNCTION app.admin_shop_permission(uuid,boolean),app.admin_suspend_shop(uuid,bigint,boolean),app.save_student_shop(uuid,bigint,text,text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.admin_shop_permission(uuid,boolean),app.admin_suspend_shop(uuid,bigint,boolean),app.save_student_shop(uuid,bigint,text,text,text,text,boolean) TO app_backend;
-- Scope legacy permissive administrative policies on store resources.
CREATE POLICY store_school_gate ON app.stores AS RESTRICTIVE TO app_backend
 USING(school_id IS NULL OR school_id=app.request_school()) WITH CHECK(school_id=app.request_school());
-- Administrative store writes now use explicit functions; owners never write governance fields.
REVOKE INSERT,UPDATE,DELETE ON app.stores FROM app_backend;
CREATE POLICY product_school_gate ON app.products AS RESTRICTIVE TO app_backend
 USING(EXISTS(SELECT 1 FROM app.stores s WHERE s.id=store_id AND (s.school_id IS NULL OR s.school_id=app.request_school())))
 WITH CHECK(EXISTS(SELECT 1 FROM app.stores s WHERE s.id=store_id AND s.school_id=app.request_school()));
CREATE POLICY product_owner_insert ON app.products FOR INSERT TO app_backend WITH CHECK(app.request_store_staff(store_id) AND price_cents>0 AND length(btrim(category))>0 AND length(btrim(unit))>0);
CREATE POLICY product_owner_update ON app.products FOR UPDATE TO app_backend USING(app.request_store_staff(store_id)) WITH CHECK(app.request_store_staff(store_id) AND price_cents>0);
CREATE POLICY staff_school_gate ON app.store_staff AS RESTRICTIVE TO app_backend
 USING(EXISTS(SELECT 1 FROM app.stores s WHERE s.id=store_id AND s.school_id=app.request_school()))
 WITH CHECK(EXISTS(SELECT 1 FROM app.stores s WHERE s.id=store_id AND s.school_id=app.request_school()));
CREATE FUNCTION app.product_owner_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.store_id<>OLD.store_id THEN RAISE EXCEPTION 'Product store cannot change' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE TRIGGER product_owner_guard BEFORE UPDATE ON app.products FOR EACH ROW EXECUTE FUNCTION app.product_owner_guard();
REVOKE ALL ON FUNCTION app.product_owner_guard() FROM PUBLIC;
CREATE OR REPLACE VIEW app.public_stores WITH(security_barrier=true) AS
 SELECT id,name,store_type,description,location,place_id,category,floor,room_number,cover_url,image_credit,source_note,
 school_id,is_open,admin_suspended,opening_hours,avatar,tagline,color,version FROM app.stores
 WHERE status='open' AND (school_id IS NULL OR school_id=app.request_school());
CREATE OR REPLACE VIEW app.public_products WITH(security_barrier=true) AS
 SELECT p.id,p.store_id,p.name,p.description,p.image_url,p.price_cents,p.stock_quantity,p.category,p.unit,p.icon,p.color
 FROM app.products p JOIN app.stores s ON s.id=p.store_id WHERE p.status='on_sale' AND app.store_accepting_orders(s.id)
 AND (s.school_id IS NULL OR s.school_id=app.request_school());
CREATE FUNCTION app.order_store_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE s app.stores;
BEGIN
 -- Lock owner before store, matching permission/account and owner-edit functions.
 SELECT * INTO s FROM app.stores WHERE id=NEW.store_id;
 IF s.student_owned THEN PERFORM 1 FROM app.users WHERE id=s.owner_id FOR UPDATE;END IF;
 SELECT * INTO s FROM app.stores WHERE id=NEW.store_id FOR UPDATE;
 IF NOT app.store_accepting_orders(s.id) OR (s.school_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM app.school_memberships WHERE user_id=NEW.buyer_id AND school_id=s.school_id)) THEN RAISE EXCEPTION 'Store not accepting orders' USING ERRCODE='23514';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER order_store_guard BEFORE INSERT ON app.shop_orders FOR EACH ROW EXECUTE FUNCTION app.order_store_guard();
REVOKE ALL ON FUNCTION app.order_store_guard() FROM PUBLIC;
CREATE OR REPLACE FUNCTION app.request_order(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM app.shop_orders o JOIN app.stores s ON s.id=o.store_id WHERE o.id=target AND
 (app.school_admin(s.school_id) OR (app.request_verified() AND (o.buyer_id=app.current_user_id() OR app.request_store_staff(o.store_id)))))
$$;
CREATE POLICY order_school_write ON app.shop_orders AS RESTRICTIVE TO app_backend
 USING(app.request_order(id)) WITH CHECK(EXISTS(SELECT 1 FROM app.stores s WHERE s.id=store_id AND app.school_admin(s.school_id)));
CREATE POLICY order_item_school_write ON app.shop_order_items AS RESTRICTIVE TO app_backend
 USING(app.request_order(order_id)) WITH CHECK(EXISTS(SELECT 1 FROM app.stores s WHERE s.id=store_id AND app.school_admin(s.school_id)));

ALTER TABLE app.wall_posts ADD COLUMN school_id text REFERENCES app.schools(id),ADD COLUMN version bigint NOT NULL DEFAULT 1;
CREATE TABLE app.post_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),school_id text NOT NULL REFERENCES app.schools(id),
 post_id uuid NOT NULL REFERENCES app.wall_posts(id),reporter_id uuid NOT NULL REFERENCES app.users(id),
 reason text NOT NULL CHECK(reason IN('不友善或冒犯内容','泄露个人信息','广告或虚假信息','其他')),
 resolved_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(school_id,post_id,reporter_id)
);
CREATE TABLE app.post_moderation_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),school_id text NOT NULL REFERENCES app.schools(id),post_id uuid NOT NULL REFERENCES app.wall_posts(id),
 actor_id uuid NOT NULL REFERENCES app.users(id),action text NOT NULL CHECK(action IN('keep','delete')),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 300),
 evidence jsonb NOT NULL,request_key uuid NOT NULL,payload_hash bytea NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(actor_id,request_key)
);
CREATE INDEX post_reports_queue_idx ON app.post_reports(school_id,post_id) WHERE resolved_at IS NULL;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['post_reports','post_moderation_decisions'] LOOP
 EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('GRANT SELECT ON app.%I TO app_backend',t);END LOOP;END $$;
CREATE POLICY report_own ON app.post_reports FOR SELECT TO app_backend USING(reporter_id=app.current_user_id() AND school_id=app.request_school() AND app.request_role()='student');
CREATE POLICY decision_admin ON app.post_moderation_decisions FOR SELECT TO app_backend USING(app.school_admin(school_id));
CREATE FUNCTION app.report_public_post(target uuid,reason_text text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE p app.wall_posts; result uuid;
BEGIN
 SELECT * INTO p FROM app.wall_posts WHERE id=target FOR UPDATE;
 IF NOT FOUND OR app.request_role() IS DISTINCT FROM 'student' OR NOT app.request_verified() OR p.school_id IS DISTINCT FROM app.request_school()
 OR p.school_id IS NULL OR p.author_id=app.current_user_id() OR p.visibility<>'campus' OR p.status<>'published' THEN RAISE EXCEPTION 'Public same school post required' USING ERRCODE='42501';END IF;
 INSERT INTO app.post_reports(school_id,post_id,reporter_id,reason) VALUES(p.school_id,target,app.current_user_id(),reason_text) RETURNING id INTO result;RETURN result;
END $$;
CREATE FUNCTION app.moderate_public_post(target uuid,expected bigint,key uuid,decision text,reason_text text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE p app.wall_posts; prior app.post_moderation_decisions; hash bytea;result uuid;
BEGIN
 SELECT * INTO p FROM app.wall_posts WHERE id=target FOR UPDATE;
 IF NOT FOUND OR NOT app.school_admin(p.school_id) OR p.visibility<>'campus' THEN RAISE EXCEPTION 'Public same school post required' USING ERRCODE='42501';END IF;
 IF key IS NULL OR decision IS NULL OR reason_text IS NULL THEN RAISE EXCEPTION 'Required moderation fields missing' USING ERRCODE='23514';END IF;
 hash:=sha256(convert_to(target::text||decision||reason_text,'UTF8'));
 SELECT * INTO prior FROM app.post_moderation_decisions WHERE actor_id=app.current_user_id() AND request_key=key;
 IF FOUND THEN IF prior.payload_hash<>hash THEN RAISE EXCEPTION 'Idempotency conflict' USING ERRCODE='23514';END IF;RETURN prior.id;END IF;
 IF expected IS NULL OR p.version<>expected THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF p.status<>'published' THEN RAISE EXCEPTION 'Post already unavailable' USING ERRCODE='23514';END IF;
 INSERT INTO app.post_moderation_decisions(school_id,post_id,actor_id,action,reason,evidence,request_key,payload_hash)
 VALUES(p.school_id,target,app.current_user_id(),decision,reason_text,
 jsonb_build_object('title',p.title,'content',p.content,'media',p.media,'category',p.category,'isAnonymous',p.is_anonymous),key,hash) RETURNING id INTO result;
 UPDATE app.wall_posts SET status=CASE WHEN decision='delete' THEN 'deleted' ELSE status END,version=version+1 WHERE id=target;
 UPDATE app.post_reports SET resolved_at=now() WHERE post_id=target AND resolved_at IS NULL;
 PERFORM app.staff_audit('post.'||decision,'post',target::text);RETURN result;
END $$;
REVOKE ALL ON FUNCTION app.report_public_post(uuid,text),app.moderate_public_post(uuid,bigint,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.report_public_post(uuid,text),app.moderate_public_post(uuid,bigint,uuid,text,text) TO app_backend;
CREATE VIEW app.admin_post_queue WITH(security_barrier=true) AS
 SELECT p.id,p.title,p.content,p.category,p.media,p.is_anonymous,p.status,p.school_id,p.version,
 (SELECT count(*) FROM app.post_reports r WHERE r.post_id=p.id AND r.resolved_at IS NULL) AS pending_reports,
 (SELECT count(*)>=3 FROM app.post_reports r WHERE r.post_id=p.id AND r.resolved_at IS NULL) AS priority
 FROM app.wall_posts p WHERE app.school_admin(p.school_id) AND p.visibility='campus' AND p.status IN('published','deleted');
CREATE VIEW app.admin_post_report_reasons WITH(security_barrier=true) AS
 SELECT r.post_id,r.reason,count(*) AS reports FROM app.post_reports r WHERE app.school_admin(r.school_id) GROUP BY r.post_id,r.reason;
GRANT SELECT ON app.admin_post_queue,app.admin_post_report_reasons TO app_backend;
-- Staff never obtain anonymous author identity via raw moderation tables.
DROP POLICY posts_private_read ON app.wall_posts;
CREATE POLICY posts_private_read ON app.wall_posts FOR SELECT TO app_backend USING(author_id=app.current_user_id() AND app.request_verified() AND status<>'deleted');
REVOKE UPDATE(status) ON app.wall_posts FROM app_backend;
CREATE POLICY wall_school_gate ON app.wall_posts AS RESTRICTIVE TO app_backend
 USING(school_id IS NULL OR school_id=app.request_school()) WITH CHECK(school_id=app.request_school());
CREATE OR REPLACE VIEW app.wall_public_posts WITH(security_barrier=true) AS
 SELECT p.id,p.title,p.content,p.category,p.location,p.media,p.is_anonymous,p.created_at,p.updated_at,
 CASE WHEN p.is_anonymous THEN NULL::uuid ELSE p.author_id END AS author_id,
 CASE WHEN p.is_anonymous THEN '匿名用户' ELSE u.display_name END AS display_name
 FROM app.wall_posts p JOIN app.users u ON u.id=p.author_id
 WHERE p.status='published' AND p.visibility='campus' AND (p.school_id IS NULL OR p.school_id=app.request_school());
CREATE OR REPLACE VIEW app.wall_public_comments WITH(security_barrier=true) AS
 SELECT c.id,c.post_id,c.content,c.is_anonymous,c.created_at,c.updated_at,
 CASE WHEN c.is_anonymous THEN NULL::uuid ELSE c.author_id END AS author_id,
 CASE WHEN c.is_anonymous THEN '匿名用户' ELSE u.display_name END AS display_name
 FROM app.wall_comments c JOIN app.wall_posts p ON p.id=c.post_id JOIN app.users u ON u.id=c.author_id
 WHERE c.status='published' AND p.status='published' AND p.visibility='campus' AND (p.school_id IS NULL OR p.school_id=app.request_school());
-- New post reporting replaces the legacy post/comment report write path.
REVOKE INSERT,UPDATE,DELETE ON app.wall_reports FROM app_backend;
DROP POLICY reports_read ON app.wall_reports;
CREATE POLICY reports_read ON app.wall_reports FOR SELECT TO app_backend USING(reporter_id=app.current_user_id() AND app.request_verified());
DROP POLICY comments_private_read ON app.wall_comments;
CREATE POLICY comments_private_read ON app.wall_comments FOR SELECT TO app_backend USING(author_id=app.current_user_id() AND app.request_verified() AND EXISTS(SELECT 1 FROM app.wall_public_posts p WHERE p.id=post_id));
REVOKE UPDATE(status) ON app.wall_comments FROM app_backend;
-- Existing support requests are confidential, not general administrator feedback.
DROP POLICY support_request_read ON app.support_requests;
DROP POLICY support_request_update ON app.support_requests;
CREATE POLICY support_request_read ON app.support_requests FOR SELECT TO app_backend USING(app.request_verified() AND
 (student_id=app.current_user_id() OR (assigned_teacher_id=app.current_user_id() AND app.request_role()='teacher' AND EXISTS(
 SELECT 1 FROM app.school_memberships m WHERE m.user_id=student_id AND m.school_id=app.request_school()))));
REVOKE UPDATE,DELETE ON app.support_requests FROM app_backend;
