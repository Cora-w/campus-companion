ALTER TABLE app.care_cases
 ADD COLUMN school_id text REFERENCES app.schools(id),
 ADD COLUMN version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 ADD COLUMN analysis_source text NOT NULL DEFAULT '', ADD COLUMN analyzed_at timestamptz,
 ADD COLUMN summary_ciphertext bytea, ADD COLUMN signals_ciphertext bytea,
 ADD COLUMN consent_revoked_at timestamptz,
 ADD COLUMN review_conclusion text CHECK(review_conclusion IN('follow_up','observe')),
 ADD COLUMN review_note_ciphertext bytea, ADD COLUMN reviewed_at timestamptz,
 ADD COLUMN observation_note_ciphertext bytea, ADD COLUMN observation_due_on date,
 ADD COLUMN closure_note_ciphertext bytea,
 ADD CONSTRAINT care_student_school_fk FOREIGN KEY(student_id,school_id) REFERENCES app.school_memberships(user_id,school_id),
 ADD CONSTRAINT care_teacher_school_fk FOREIGN KEY(teacher_id,school_id) REFERENCES app.school_memberships(user_id,school_id);
CREATE INDEX care_school_teacher_idx ON app.care_cases(school_id,teacher_id,status,observation_due_on);
CREATE FUNCTION app.can_read_case(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM app.care_cases c JOIN app.users s ON s.id=c.student_id
 WHERE c.id=target AND c.school_id=app.request_school() AND c.teacher_id=app.current_user_id()
 AND app.request_role()='teacher' AND app.request_verified() AND s.status='active' AND s.role='student'
 AND c.consent_at<=now() AND c.consent_revoked_at IS NULL AND (c.consent_expires_at IS NULL OR c.consent_expires_at>now()))
$$;
REVOKE ALL ON FUNCTION app.can_read_case(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_read_case(uuid) TO app_backend;
DROP POLICY care_case_teacher_read ON app.care_cases;
DROP POLICY care_snapshot_teacher_read ON app.wellbeing_snapshots;
DROP POLICY care_record_teacher_read ON app.care_records;
DROP POLICY care_record_teacher_write ON app.care_records;
DROP POLICY report_teacher_read ON app.wellbeing_reports;
CREATE POLICY care_case_teacher_read ON app.care_cases FOR SELECT TO app_backend USING(app.can_read_case(id));
CREATE POLICY care_snapshot_teacher_read ON app.wellbeing_snapshots FOR SELECT TO app_backend USING(app.can_read_case(case_id));
CREATE POLICY care_record_teacher_read ON app.care_records FOR SELECT TO app_backend USING(app.can_read_case(case_id));
CREATE POLICY report_teacher_read ON app.wellbeing_reports FOR SELECT TO app_backend USING(app.can_read_case(case_id));
REVOKE INSERT ON app.care_records FROM app_backend;

CREATE TABLE app.care_case_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES app.care_cases(id),
 actor_id uuid NOT NULL REFERENCES app.users(id),action text NOT NULL,
 note_ciphertext bytea,request_key uuid NOT NULL,payload_hash bytea NOT NULL,
 result_version bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(case_id,actor_id,request_key)
);
CREATE TABLE app.care_appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES app.care_cases(id),
 teacher_id uuid NOT NULL REFERENCES app.teacher_profiles(user_id), student_id uuid NOT NULL REFERENCES app.student_profiles(user_id),
 starts_at timestamptz NOT NULL, duration_minutes integer NOT NULL CHECK(duration_minutes IN(30,45,60)),
 method text NOT NULL CHECK(method IN('in_person','online','phone','follow_up')),
 location_ciphertext bytea NOT NULL CHECK(octet_length(location_ciphertext)>0),
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN('scheduled','completed','no_show','cancelled')),
 response_status text NOT NULL DEFAULT 'pending' CHECK(response_status IN('pending','accepted','reschedule_requested','declined')),
 requested_start timestamptz, response_note_ciphertext bytea,responded_at timestamptz,
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),request_key uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(teacher_id,request_key), UNIQUE(id,case_id,teacher_id),
 CHECK(status<>'completed' OR response_status='accepted'),
 CHECK((response_status='reschedule_requested')=(requested_start IS NOT NULL)),
 CHECK(response_status NOT IN('reschedule_requested','declined') OR coalesce(octet_length(response_note_ciphertext),0)>0)
);
CREATE INDEX appointment_teacher_time_idx ON app.care_appointments(teacher_id,starts_at) WHERE status='scheduled';
CREATE INDEX appointment_student_idx ON app.care_appointments(student_id,starts_at DESC);
ALTER TABLE app.care_records ADD COLUMN response_ciphertext bytea,
 ADD COLUMN appointment_id uuid,
 ADD CONSTRAINT record_appointment_fk FOREIGN KEY(appointment_id,case_id,teacher_id) REFERENCES app.care_appointments(id,case_id,teacher_id);
CREATE UNIQUE INDEX record_appointment_unique ON app.care_records(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE TABLE app.care_escalations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES app.care_cases(id),
 teacher_id uuid NOT NULL REFERENCES app.teacher_profiles(user_id),recipient_id uuid NOT NULL REFERENCES app.teacher_profiles(user_id),
 recipient_label text NOT NULL CHECK(length(btrim(recipient_label)) BETWEEN 1 AND 120),
 reason_ciphertext bytea NOT NULL CHECK(octet_length(reason_ciphertext)>0),measures_ciphertext bytea,
 acknowledged_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(teacher_id<>recipient_id)
);
CREATE TABLE app.teacher_reminder_preferences (
 teacher_id uuid PRIMARY KEY REFERENCES app.teacher_profiles(user_id),
 priority_enabled boolean NOT NULL DEFAULT true,follow_up_enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['care_case_events','care_appointments','care_escalations','teacher_reminder_preferences'] LOOP
 EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('GRANT SELECT ON app.%I TO app_backend',t);
 END LOOP;
END $$;
CREATE POLICY case_event_read ON app.care_case_events FOR SELECT TO app_backend USING(app.can_read_case(case_id));
-- Students receive appointment logistics only; not case risk, summary or records.
CREATE FUNCTION app.can_read_invitation(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM app.care_cases c JOIN app.users t ON t.id=c.teacher_id
 WHERE c.id=target AND c.student_id=app.current_user_id() AND c.school_id=app.request_school()
 AND app.request_role()='student' AND app.request_verified() AND t.status='active' AND t.role='teacher'
 AND c.consent_at<=now() AND c.consent_revoked_at IS NULL AND (c.consent_expires_at IS NULL OR c.consent_expires_at>now()))
$$;
REVOKE ALL ON FUNCTION app.can_read_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_read_invitation(uuid) TO app_backend;
CREATE POLICY appointment_read ON app.care_appointments FOR SELECT TO app_backend USING(app.can_read_case(case_id) OR app.can_read_invitation(case_id));
CREATE FUNCTION app.can_receive_escalation(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM app.care_escalations e JOIN app.care_cases c ON c.id=e.case_id
 WHERE e.id=target AND e.recipient_id=app.current_user_id() AND app.request_role()='teacher' AND app.request_verified()
 AND c.school_id=app.request_school() AND c.consent_revoked_at IS NULL AND c.consent_at<=now()
 AND (c.consent_expires_at IS NULL OR c.consent_expires_at>now()))
$$;
REVOKE ALL ON FUNCTION app.can_receive_escalation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_receive_escalation(uuid) TO app_backend;
CREATE POLICY escalation_read ON app.care_escalations FOR SELECT TO app_backend USING(app.can_read_case(case_id) OR app.can_receive_escalation(id));
-- Recipient acknowledgements use a narrowly scoped function, not a simulated sender acknowledgement.
CREATE POLICY reminder_own ON app.teacher_reminder_preferences FOR ALL TO app_backend
 USING(teacher_id=app.current_user_id() AND app.request_role()='teacher' AND app.request_verified() AND app.request_school() IS NOT NULL)
 WITH CHECK(teacher_id=app.current_user_id() AND app.request_role()='teacher' AND app.request_verified() AND app.request_school() IS NOT NULL);
GRANT INSERT,UPDATE ON app.teacher_reminder_preferences TO app_backend;
CREATE TRIGGER reminder_updated BEFORE UPDATE ON app.teacher_reminder_preferences FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE FUNCTION app.care_child_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c app.care_cases;
BEGIN
 SELECT * INTO c FROM app.care_cases WHERE id=NEW.case_id;
 IF TG_TABLE_NAME IN('wellbeing_snapshots','care_appointments') THEN
 IF NEW.student_id<>c.student_id THEN RAISE EXCEPTION 'Student mismatch' USING ERRCODE='23514'; END IF; END IF;
 IF TG_TABLE_NAME IN('care_records','wellbeing_reports','care_appointments','care_escalations') THEN
 IF NEW.teacher_id<>c.teacher_id THEN RAISE EXCEPTION 'Teacher mismatch' USING ERRCODE='23514'; END IF; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['wellbeing_snapshots','care_records','wellbeing_reports','care_appointments','care_escalations'] LOOP
 EXECUTE format('CREATE TRIGGER care_child_integrity BEFORE INSERT OR UPDATE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.care_child_integrity()',t);
 END LOOP;END $$;
REVOKE ALL ON FUNCTION app.care_child_integrity() FROM PUBLIC;

-- Ciphertext fields are base64 transport of authenticated ciphertext produced by
-- the trusted service, not plaintext/base64 encoding as a substitute for encryption.
CREATE FUNCTION app.teacher_case_action(target uuid,expected bigint,key uuid,operation text,payload jsonb) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c app.care_cases; previous app.care_case_events; n bytea; hash bytea; recipient uuid;
BEGIN
 IF key IS NULL OR operation IS NULL OR payload IS NULL OR jsonb_typeof(payload)<>'object' THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='23514'; END IF;
 SELECT * INTO c FROM app.care_cases WHERE id=target FOR UPDATE;
 IF NOT app.can_read_case(target) THEN RAISE EXCEPTION 'Assigned verified teacher required' USING ERRCODE='42501'; END IF;
 hash:=sha256(convert_to(operation||payload::text,'UTF8'));
 SELECT * INTO previous FROM app.care_case_events WHERE case_id=target AND actor_id=app.current_user_id() AND request_key=key;
 IF FOUND THEN IF previous.payload_hash<>hash THEN RAISE EXCEPTION 'Idempotency conflict' USING ERRCODE='23514'; END IF;RETURN previous.result_version;END IF;
 IF expected IS NULL OR c.version<>expected THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001';END IF;
 n:=decode(payload->>'note','base64');
 IF operation<>'reopen' AND coalesce(octet_length(n),0)=0 THEN RAISE EXCEPTION 'Encrypted note required' USING ERRCODE='23514'; END IF;
 IF operation='reopen' THEN
 IF c.status<>'archived' THEN RAISE EXCEPTION 'Case is not closed' USING ERRCODE='23514';END IF;
 UPDATE app.care_cases SET status='following',archived_at=NULL,closure_note_ciphertext=NULL WHERE id=target;
 ELSE
 IF c.status='archived' THEN RAISE EXCEPTION 'Archived case is read only' USING ERRCODE='23514'; END IF;
 CASE operation
 WHEN 'review_follow_up','review_observe' THEN
 IF operation='review_observe' AND ((payload->>'nextDate') IS NULL OR (payload->>'nextDate')::date<(now() AT TIME ZONE 'Asia/Shanghai')::date) THEN RAISE EXCEPTION 'Observation date required' USING ERRCODE='23514'; END IF;
 UPDATE app.care_cases SET status='following',review_conclusion=CASE WHEN operation='review_observe' THEN 'observe' ELSE 'follow_up' END,
 review_note_ciphertext=n,reviewed_at=now(),observation_note_ciphertext=CASE WHEN operation='review_observe' THEN n END,
 observation_due_on=CASE WHEN operation='review_observe' THEN (payload->>'nextDate')::date END WHERE id=target;
 WHEN 'record' THEN
 IF c.status<>'following' OR c.reviewed_at IS NULL OR coalesce(octet_length(decode(payload->>'plan','base64')),0)=0
 OR (payload->>'nextDate') IS NULL OR (payload->>'nextDate')::date<(now() AT TIME ZONE 'Asia/Shanghai')::date THEN RAISE EXCEPTION 'Review, plan and follow up date required' USING ERRCODE='23514'; END IF;
 IF payload->>'appointmentId' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM app.care_appointments WHERE id=(payload->>'appointmentId')::uuid AND case_id=target AND status='completed') THEN RAISE EXCEPTION 'Completed appointment required' USING ERRCODE='23514'; END IF;
 INSERT INTO app.care_records(case_id,teacher_id,method,summary_ciphertext,plan_ciphertext,next_follow_up_on,response_ciphertext,appointment_id)
 VALUES(target,c.teacher_id,payload->>'method',n,decode(payload->>'plan','base64'),(payload->>'nextDate')::date,decode(payload->>'response','base64'),(payload->>'appointmentId')::uuid);
 UPDATE app.care_cases SET observation_note_ciphertext=NULL,observation_due_on=NULL WHERE id=target;
 WHEN 'close' THEN
 IF c.status<>'following' OR NOT EXISTS(SELECT 1 FROM app.care_records WHERE case_id=target)
 OR EXISTS(SELECT 1 FROM app.care_appointments WHERE case_id=target AND status='scheduled')
 OR EXISTS(SELECT 1 FROM app.care_escalations WHERE case_id=target AND acknowledged_at IS NULL) THEN RAISE EXCEPTION 'Unfinished care workflow' USING ERRCODE='23514';END IF;
 UPDATE app.care_cases SET status='archived',archived_at=now(),closure_note_ciphertext=n,observation_note_ciphertext=NULL,observation_due_on=NULL WHERE id=target;
 WHEN 'escalate' THEN
 recipient:=(payload->>'recipientId')::uuid;
 IF NOT EXISTS(SELECT 1 FROM app.users u JOIN app.school_memberships m ON m.user_id=u.id WHERE u.id=recipient AND u.role='teacher' AND u.status='active' AND m.school_id=c.school_id) THEN RAISE EXCEPTION 'Same school teacher recipient required' USING ERRCODE='23514'; END IF;
 INSERT INTO app.care_escalations(case_id,teacher_id,recipient_id,recipient_label,reason_ciphertext,measures_ciphertext)
 VALUES(target,c.teacher_id,recipient,payload->>'recipientLabel',n,decode(payload->>'measures','base64'));
 ELSE RAISE EXCEPTION 'Unknown operation' USING ERRCODE='23514';
 END CASE;END IF;
 UPDATE app.care_cases SET version=version+1 WHERE id=target;
 INSERT INTO app.care_case_events(case_id,actor_id,action,note_ciphertext,request_key,payload_hash,result_version)
 VALUES(target,app.current_user_id(),operation,n,key,hash,expected+1);
 -- Confidential case events stay in teacher-only storage, not administrator logs.
 RETURN expected+1;
END $$;
REVOKE ALL ON FUNCTION app.teacher_case_action(uuid,bigint,uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.teacher_case_action(uuid,bigint,uuid,text,jsonb) TO app_backend;

CREATE FUNCTION app.save_care_appointment(target uuid,appointment uuid,expected bigint,key uuid,start_time timestamptz,duration integer,kind text,location_data bytea) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c app.care_cases; a app.care_appointments; result uuid; hash bytea; previous record;
BEGIN
 -- Global per-teacher lock serializes overlaps across different cases.
 PERFORM pg_advisory_xact_lock(hashtextextended('care-booking:'||app.current_user_id()::text,0));
 SELECT * INTO c FROM app.care_cases WHERE id=target FOR UPDATE;
 IF NOT app.can_read_case(target) THEN RAISE EXCEPTION 'Unauthorized case' USING ERRCODE='42501'; END IF;
 IF key IS NULL THEN RAISE EXCEPTION 'Request key required' USING ERRCODE='23514'; END IF;
 hash:=sha256(convert_to(jsonb_build_array(target,appointment,expected,extract(epoch FROM start_time),duration,kind,encode(location_data,'base64'))::text,'UTF8'));
 SELECT * INTO previous FROM app.care_appointment_events WHERE actor_id=app.current_user_id() AND request_key=key;
 IF FOUND THEN
 IF previous.payload_hash<>hash THEN RAISE EXCEPTION 'Idempotency conflict' USING ERRCODE='23514';END IF;
 RETURN previous.appointment_id;END IF;
 IF appointment IS NOT NULL THEN
 SELECT * INTO a FROM app.care_appointments WHERE id=appointment AND case_id=target FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Appointment unavailable' USING ERRCODE='42501'; END IF;
 IF expected IS NULL OR a.version<>expected THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF a.status<>'scheduled' THEN RAISE EXCEPTION 'Appointment already ended' USING ERRCODE='23514'; END IF;
 END IF;
 IF key IS NULL OR start_time IS NULL OR duration IS NULL OR kind IS NULL OR coalesce(octet_length(location_data),0)=0 OR c.status<>'following' OR c.reviewed_at IS NULL OR start_time<=now() OR duration NOT IN(30,45,60)
 OR (start_time AT TIME ZONE 'Asia/Shanghai')+make_interval(mins=>duration)>date_trunc('day',start_time AT TIME ZONE 'Asia/Shanghai')+interval '1 day'
 THEN RAISE EXCEPTION 'Invalid booking' USING ERRCODE='23514';END IF;
 IF EXISTS(SELECT 1 FROM app.care_appointments b WHERE b.teacher_id=c.teacher_id AND b.status='scheduled' AND (appointment IS NULL OR b.id<>appointment)
 AND b.starts_at<start_time+make_interval(mins=>duration) AND start_time<b.starts_at+make_interval(mins=>b.duration_minutes)) THEN RAISE EXCEPTION 'Appointment overlap' USING ERRCODE='23P01';END IF;
 IF appointment IS NULL THEN
 INSERT INTO app.care_appointments(case_id,teacher_id,student_id,starts_at,duration_minutes,method,location_ciphertext,request_key)
 VALUES(target,c.teacher_id,c.student_id,start_time,duration,kind,location_data,key) RETURNING id INTO result;
 ELSE
 UPDATE app.care_appointments SET starts_at=start_time,duration_minutes=duration,method=kind,location_ciphertext=location_data,
 response_status='pending',requested_start=NULL,response_note_ciphertext=NULL,responded_at=NULL,version=version+1,updated_at=now() WHERE id=appointment;result:=appointment;
 END IF;
 UPDATE app.care_appointment_events SET request_key=key,payload_hash=hash
 WHERE appointment_id=result AND version=(SELECT version FROM app.care_appointments WHERE id=result);
 RETURN result;
END $$;
CREATE FUNCTION app.respond_care_appointment(target uuid,expected bigint,response text,requested timestamptz,note bytea) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a app.care_appointments;
BEGIN
 SELECT * INTO a FROM app.care_appointments WHERE id=target FOR UPDATE;
 IF NOT FOUND OR NOT app.can_read_invitation(a.case_id) THEN RAISE EXCEPTION 'Unauthorized invitation' USING ERRCODE='42501'; END IF;
 IF expected IS NULL OR a.version<>expected THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001';END IF;
 IF a.status<>'scheduled' OR a.response_status<>'pending' OR a.starts_at<=now() OR response IS NULL OR response NOT IN('accepted','reschedule_requested','declined')
 OR (response='reschedule_requested' AND (requested IS NULL OR requested<=now()))
 OR (response IN('reschedule_requested','declined') AND coalesce(octet_length(note),0)=0) THEN RAISE EXCEPTION 'Invalid invitation response' USING ERRCODE='23514'; END IF;
 UPDATE app.care_appointments SET response_status=response,requested_start=CASE WHEN response='reschedule_requested' THEN requested END,
 response_note_ciphertext=CASE WHEN response<>'accepted' THEN note END,responded_at=now(),version=version+1,updated_at=now() WHERE id=target;
 RETURN expected+1;
END $$;
CREATE FUNCTION app.finish_care_appointment(target uuid,expected bigint,new_status text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a app.care_appointments; c uuid;
BEGIN
 SELECT case_id INTO c FROM app.care_appointments WHERE id=target;
 PERFORM 1 FROM app.care_cases WHERE id=c FOR UPDATE;
 SELECT * INTO a FROM app.care_appointments WHERE id=target FOR UPDATE;
 IF NOT FOUND OR NOT app.can_read_case(a.case_id) THEN RAISE EXCEPTION 'Unauthorized invitation' USING ERRCODE='42501'; END IF;
 IF expected IS NULL OR a.version<>expected THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001';END IF;
 IF a.status<>'scheduled' OR new_status IS NULL OR new_status NOT IN('completed','no_show','cancelled') OR (new_status='completed' AND a.response_status<>'accepted') THEN RAISE EXCEPTION 'Invalid appointment state' USING ERRCODE='23514';END IF;
 UPDATE app.care_appointments SET status=new_status,version=version+1,updated_at=now() WHERE id=target;RETURN expected+1;
END $$;
CREATE FUNCTION app.acknowledge_care_escalation(target uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE e app.care_escalations; c app.care_cases;
BEGIN
 SELECT * INTO e FROM app.care_escalations WHERE id=target;
 SELECT * INTO c FROM app.care_cases WHERE id=e.case_id FOR UPDATE;
 IF e.recipient_id IS DISTINCT FROM app.current_user_id() OR app.request_role() IS DISTINCT FROM 'teacher' OR NOT app.request_verified()
 OR c.school_id IS DISTINCT FROM app.request_school() OR c.consent_at>now() OR c.consent_revoked_at IS NOT NULL OR c.consent_expires_at<=now() THEN RAISE EXCEPTION 'Recipient permission required' USING ERRCODE='42501';END IF;
 UPDATE app.care_escalations SET acknowledged_at=coalesce(acknowledged_at,now()) WHERE id=target;
END $$;
REVOKE ALL ON FUNCTION app.save_care_appointment(uuid,uuid,bigint,uuid,timestamptz,integer,text,bytea),app.respond_care_appointment(uuid,bigint,text,timestamptz,bytea),app.finish_care_appointment(uuid,bigint,text),app.acknowledge_care_escalation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.save_care_appointment(uuid,uuid,bigint,uuid,timestamptz,integer,text,bytea),app.respond_care_appointment(uuid,bigint,text,timestamptz,bytea),app.finish_care_appointment(uuid,bigint,text),app.acknowledge_care_escalation(uuid) TO app_backend;
CREATE VIEW app.teacher_workbench WITH(security_barrier=true) AS
 SELECT c.id,c.status,c.risk_level,c.version,c.observation_due_on,
 (SELECT r.next_follow_up_on FROM app.care_records r WHERE r.case_id=c.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1) AS next_follow_up_on
 FROM app.care_cases c WHERE app.can_read_case(c.id);
GRANT SELECT ON app.teacher_workbench TO app_backend;

CREATE TABLE app.care_appointment_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 appointment_id uuid NOT NULL REFERENCES app.care_appointments(id),
 actor_id uuid REFERENCES app.users(id),version bigint NOT NULL,
 status text NOT NULL,response_status text NOT NULL,starts_at timestamptz NOT NULL,
 requested_start timestamptz,response_note_ciphertext bytea,
 request_key uuid,payload_hash bytea,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(appointment_id,version)
);
CREATE UNIQUE INDEX appointment_request_unique ON app.care_appointment_events(actor_id,request_key) WHERE request_key IS NOT NULL;
ALTER TABLE app.care_appointment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.care_appointment_events FORCE ROW LEVEL SECURITY;
GRANT SELECT ON app.care_appointment_events TO app_backend;
CREATE POLICY appointment_event_read ON app.care_appointment_events FOR SELECT TO app_backend USING(EXISTS(
 SELECT 1 FROM app.care_appointments a WHERE a.id=appointment_id AND (app.can_read_case(a.case_id) OR app.can_read_invitation(a.case_id))));
CREATE FUNCTION app.log_appointment_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO app.care_appointment_events(appointment_id,actor_id,version,status,response_status,starts_at,requested_start,response_note_ciphertext)
 VALUES(NEW.id,app.current_user_id(),NEW.version,NEW.status,NEW.response_status,NEW.starts_at,NEW.requested_start,NEW.response_note_ciphertext);
 RETURN NEW;
END $$;
CREATE TRIGGER appointment_event AFTER INSERT OR UPDATE ON app.care_appointments FOR EACH ROW EXECUTE FUNCTION app.log_appointment_event();
REVOKE ALL ON FUNCTION app.log_appointment_event() FROM PUBLIC;
