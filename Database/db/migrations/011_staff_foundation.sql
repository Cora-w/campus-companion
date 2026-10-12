-- Frontend contract reviewed at be31998 (2026-10-12). Never auto-bind existing users.
CREATE TABLE app.schools (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  city text NOT NULL DEFAULT '', binding_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO app.schools VALUES ('sichuan-aerospace-polytechnic','四川航天职业技术学院','广汉 / 成都',true);
CREATE TABLE app.school_memberships (
  user_id uuid PRIMARY KEY REFERENCES app.users(id) ON DELETE RESTRICT,
  school_id text NOT NULL REFERENCES app.schools(id),
  assigned_by uuid REFERENCES app.users(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,school_id)
);
CREATE INDEX school_memberships_school_idx ON app.school_memberships(school_id,user_id);
CREATE FUNCTION app.request_school() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT school_id FROM app.school_memberships WHERE user_id=app.current_user_id() AND app.request_role() IS NOT NULL
$$;
CREATE FUNCTION app.school_admin(target text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce(app.request_admin() AND target=app.request_school(),false)
$$;
REVOKE ALL ON FUNCTION app.request_school(),app.school_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.request_school(),app.school_admin(text) TO app_backend,app_agent;
ALTER TABLE app.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.schools FORCE ROW LEVEL SECURITY;
ALTER TABLE app.school_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.school_memberships FORCE ROW LEVEL SECURITY;
GRANT SELECT ON app.schools,app.school_memberships TO app_backend;
CREATE POLICY school_catalog ON app.schools FOR SELECT TO app_backend USING(binding_enabled OR id=app.request_school());
CREATE POLICY membership_read ON app.school_memberships FOR SELECT TO app_backend
 USING(app.request_role() IS NOT NULL AND (user_id=app.current_user_id() OR app.school_admin(school_id)));
CREATE FUNCTION app.bind_my_school(target text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE existing text;
BEGIN
 IF app.request_role() IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Student session required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM app.users WHERE id=app.current_user_id() FOR UPDATE;
 SELECT school_id INTO existing FROM app.school_memberships WHERE user_id=app.current_user_id();
 IF existing=target THEN RETURN existing; END IF;
 IF existing IS NOT NULL THEN RAISE EXCEPTION 'School already bound' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM app.schools WHERE id=target AND binding_enabled) THEN RAISE EXCEPTION 'School unavailable' USING ERRCODE='23514'; END IF;
 INSERT INTO app.school_memberships(user_id,school_id) VALUES(app.current_user_id(),target);
 RETURN target;
END $$;
REVOKE ALL ON FUNCTION app.bind_my_school(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.bind_my_school(text) TO app_backend;

ALTER TABLE app.users ADD COLUMN version bigint NOT NULL DEFAULT 1 CHECK(version>0);
ALTER TABLE app.audit_logs ADD COLUMN school_id text REFERENCES app.schools(id);
DROP POLICY audit_read ON app.audit_logs;
CREATE POLICY audit_read ON app.audit_logs FOR SELECT TO app_backend USING(app.school_admin(school_id));
CREATE INDEX audit_school_idx ON app.audit_logs(school_id,created_at DESC);
CREATE VIEW app.admin_accounts WITH(security_barrier=true) AS
 SELECT u.id,u.login_account,u.display_name,u.role,u.status,u.version,m.school_id
 FROM app.users u JOIN app.school_memberships m ON m.user_id=u.id WHERE app.school_admin(m.school_id);
GRANT SELECT ON app.admin_accounts TO app_backend;
CREATE FUNCTION app.staff_audit(action_name text,kind text,target text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 INSERT INTO app.audit_logs(actor_id,school_id,action,resource_type,resource_id)
 VALUES(app.current_user_id(),app.request_school(),action_name,kind,target)
$$;
REVOKE ALL ON FUNCTION app.staff_audit(text,text,text) FROM PUBLIC;

CREATE FUNCTION app.admin_update_account(target uuid,expected bigint,new_name text,new_role text,new_status text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE old app.users; school text;
BEGIN
 school:=app.request_school();
 IF NOT app.school_admin(school) THEN RAISE EXCEPTION 'School administrator required' USING ERRCODE='42501'; END IF;
 -- Lock school first to serialize concurrent last-admin changes.
 PERFORM 1 FROM app.schools WHERE id=school FOR UPDATE;
 SELECT u.* INTO old FROM app.users u JOIN app.school_memberships m ON m.user_id=u.id
 WHERE u.id=target AND m.school_id=school FOR UPDATE OF u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
 IF expected IS NULL OR old.version<>expected THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF new_name IS NULL OR new_role IS NULL OR new_status IS NULL THEN RAISE EXCEPTION 'Required fields missing' USING ERRCODE='23514';END IF;
 IF target=app.current_user_id() AND (new_role<>old.role OR new_status<>'active') THEN RAISE EXCEPTION 'Cannot disable or change own role' USING ERRCODE='23514'; END IF;
 IF old.role='admin' AND old.status='active' AND (new_role<>'admin' OR new_status<>'active') AND NOT EXISTS(
 SELECT 1 FROM app.users u JOIN app.school_memberships m ON m.user_id=u.id WHERE m.school_id=school AND u.id<>target AND u.role='admin' AND u.status='active') THEN
 RAISE EXCEPTION 'Last administrator' USING ERRCODE='23514'; END IF;
 UPDATE app.users SET display_name=new_name,role=new_role,status=new_status,version=version+1 WHERE id=target;
 IF new_role IS DISTINCT FROM old.role OR new_status IS DISTINCT FROM old.status THEN DELETE FROM app.auth_sessions WHERE user_id=target; END IF;
 PERFORM app.staff_audit('account.updated','user',target::text);
 RETURN expected+1;
END $$;
REVOKE ALL ON FUNCTION app.admin_update_account(uuid,bigint,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.admin_update_account(uuid,bigint,text,text,text) TO app_backend;
REVOKE UPDATE ON app.users FROM app_backend;
REVOKE DELETE ON app.users FROM app_backend;
GRANT UPDATE(password_hash,email,email_ciphertext,email_lookup,private_profile_ciphertext,profile,last_login_at,login_account) ON app.users TO app_backend;
-- Authentication/registration is still a trusted backend capability. Account
-- display/role/state mutations require the scoped administrative function.

-- Supply the UUID before encrypting email so authenticated encryption can bind
-- the ciphertext to this user. Password hashing remains in the trusted service.
CREATE FUNCTION app.admin_create_account(target uuid,account text,name text,role_value text,hash text,email_data bytea,email_index bytea) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE school text:=app.request_school();
BEGIN
 IF NOT app.school_admin(school) THEN RAISE EXCEPTION 'School administrator required' USING ERRCODE='42501';END IF;
 IF target IS NULL OR account IS NULL OR role_value IS NULL OR role_value NOT IN('student','teacher','admin')
 OR coalesce(octet_length(email_data),0)=0 OR coalesce(octet_length(email_index),0)<>32 THEN RAISE EXCEPTION 'Invalid account data' USING ERRCODE='23514';END IF;
 INSERT INTO app.users(id,email,login_account,password_hash,display_name,role,email_ciphertext,email_lookup)
 VALUES(target,target::text||'@private.invalid',lower(btrim(account)),hash,name,role_value,email_data,email_index);
 INSERT INTO app.school_memberships(user_id,school_id,assigned_by) VALUES(target,school,app.current_user_id());
 PERFORM app.staff_audit('account.created','user',target::text);
 RETURN target;
END $$;
REVOKE ALL ON FUNCTION app.admin_create_account(uuid,text,text,text,text,bytea,bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.admin_create_account(uuid,text,text,text,text,bytea,bytea) TO app_backend;

CREATE TABLE app.student_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id text NOT NULL REFERENCES app.schools(id),
 student_id uuid NOT NULL, body text NOT NULL DEFAULT '' CHECK(length(body)<=500),
 images jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(images)='array' AND jsonb_array_length(images)<=3),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','processing','replied')),
 reply text NOT NULL DEFAULT '' CHECK(length(reply)<=1000), replied_by uuid REFERENCES app.users(id),
 request_key uuid NOT NULL,version bigint NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(student_id,school_id) REFERENCES app.school_memberships(user_id,school_id),
 UNIQUE(student_id,request_key),
 CHECK(length(btrim(body))>=5 OR jsonb_array_length(images)>0),
 CHECK(status<>'replied' OR (length(btrim(reply))>0 AND replied_by IS NOT NULL))
);
CREATE INDEX feedback_school_idx ON app.student_feedback(school_id,status,created_at DESC);
ALTER TABLE app.student_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.student_feedback FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON app.student_feedback TO app_backend;
GRANT UPDATE(status,reply,replied_by,version) ON app.student_feedback TO app_backend;
CREATE POLICY feedback_read ON app.student_feedback FOR SELECT TO app_backend USING(app.school_admin(school_id) OR (school_id=app.request_school() AND student_id=app.current_user_id() AND app.request_role()='student'));
CREATE POLICY feedback_create ON app.student_feedback FOR INSERT TO app_backend WITH CHECK(school_id=app.request_school() AND student_id=app.current_user_id() AND app.request_role()='student' AND status='pending' AND reply='' AND replied_by IS NULL AND version=1);
CREATE POLICY feedback_reply ON app.student_feedback FOR UPDATE TO app_backend USING(app.school_admin(school_id)) WITH CHECK(app.school_admin(school_id) AND (replied_by IS NULL OR replied_by=app.current_user_id()));
CREATE FUNCTION app.feedback_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE image jsonb;
BEGIN
 FOR image IN SELECT value FROM jsonb_array_elements(NEW.images) LOOP
 IF jsonb_typeof(image)<>'string' OR (image #>> '{}') !~ '^https://' THEN RAISE EXCEPTION 'Use authorized HTTPS image URLs, not base64' USING ERRCODE='23514'; END IF;
 END LOOP;
 IF TG_OP='UPDATE' THEN
 IF NEW.version IS NULL OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF OLD.status='replied' AND NEW.status<>'replied' THEN RAISE EXCEPTION 'Cannot reopen replied feedback' USING ERRCODE='23514'; END IF;
 NEW.updated_at:=now(); PERFORM app.staff_audit('feedback.updated','feedback',NEW.id::text);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER feedback_guard BEFORE INSERT OR UPDATE ON app.student_feedback FOR EACH ROW EXECUTE FUNCTION app.feedback_guard();
REVOKE ALL ON FUNCTION app.feedback_guard() FROM PUBLIC;

ALTER TABLE app.campus_notices ADD COLUMN school_id text REFERENCES app.schools(id), ADD COLUMN version bigint NOT NULL DEFAULT 1;
DROP POLICY notice_read ON app.campus_notices;
CREATE POLICY notice_read ON app.campus_notices FOR SELECT TO app_backend USING(app.school_admin(school_id) OR (school_id=app.request_school() AND status='published' AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now())));
GRANT INSERT ON app.campus_notices TO app_backend;
GRANT UPDATE(title,detail,status,starts_at,ends_at,version) ON app.campus_notices TO app_backend;
CREATE POLICY notice_insert ON app.campus_notices FOR INSERT TO app_backend WITH CHECK(app.school_admin(school_id) AND created_by=app.current_user_id());
CREATE POLICY notice_update ON app.campus_notices FOR UPDATE TO app_backend USING(app.school_admin(school_id)) WITH CHECK(app.school_admin(school_id));
CREATE OR REPLACE VIEW app.public_campus_notices WITH(security_barrier=true) AS
 SELECT id,notice_type,title,detail,action_label,starts_at,ends_at,created_at,school_id,version FROM app.campus_notices
 WHERE school_id=app.request_school() AND status='published' AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now());
CREATE FUNCTION app.notice_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF length(btrim(NEW.title)) NOT BETWEEN 1 AND 60 OR length(btrim(NEW.detail)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Invalid notice content' USING ERRCODE='23514'; END IF;
 NEW.updated_at:=now();PERFORM app.staff_audit('notice.'||NEW.status,'notice',NEW.id::text);RETURN NEW;
END $$;
CREATE TRIGGER notice_guard BEFORE INSERT OR UPDATE ON app.campus_notices FOR EACH ROW EXECUTE FUNCTION app.notice_guard();
REVOKE ALL ON FUNCTION app.notice_guard() FROM PUBLIC;
