import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';

export async function testStaffWorkflows(t,{owner,backend,agent,ids,connect}) {
  const digest=x=>createHash('sha256').update(x).digest();
  const deny=code=>e=>e.code===code;
  const school='sichuan-aerospace-polytechnic';
  const run=async(user,sql,args=[])=>{
    await backend.query('BEGIN');
    try {await backend.query("SELECT set_config('app.user_id',$1,true),set_config('app.session_hash',$2,true)",[user??'',user?digest(user).toString('hex'):'']);const r=await backend.query(sql,args);await backend.query('COMMIT');return r;}
    catch(e){await backend.query('ROLLBACK');throw e;}
  };
  await owner.query("INSERT INTO app.schools VALUES('other-school','Other','Other',true)");
  for(const [key,role] of [['teacher2','teacher'],['foreignTeacher','teacher'],['foreignAdmin','admin'],['studentC','student'],['unbound','student'],['admin2','admin']]){
    const id=ids[key]=randomUUID();
    await owner.query(`INSERT INTO app.users(id,email,password_hash,display_name,role,email_ciphertext,email_lookup) VALUES($1,$2,'test-hash-not-for-login',$3,$4,$5,$6)`,[id,id+'@private.invalid',key,role,Buffer.from('test'),digest(id)]);
    if(role==='teacher')await owner.query('INSERT INTO app.teacher_profiles(user_id,employee_no_ciphertext,employee_no_lookup) VALUES($1,$2,$3)',[id,Buffer.from('test'),digest(id)]);
    if(role==='student')await owner.query('INSERT INTO app.student_profiles(user_id,student_no_ciphertext,student_no_lookup) VALUES($1,$2,$3)',[id,Buffer.from('test'),digest(id)]);
    if(role!=='admin')await owner.query(`INSERT INTO app.identity_verifications(user_id,identity_type,real_name_ciphertext,credential_lookup,status,verified_by,verified_at) VALUES($1,$2,$3,$4,'verified',$5,now()-interval '1 hour')`,[id,role,Buffer.from('test'),digest(id),ids.admin]);
    await owner.query(`INSERT INTO app.auth_sessions(token_hash,user_id,csrf_token,expires_at,authenticated_identity_id,identity_authenticated_at,identity_valid_until)
    VALUES($1,$2,'test',now()+interval '1 day',(SELECT id FROM app.identity_verifications WHERE user_id=$2),CASE WHEN $3 THEN NULL ELSE now() END,CASE WHEN $3 THEN NULL ELSE now()+interval '1 hour' END)`,[digest(id),id,role==='admin']);
  }
  for(const [key,id] of Object.entries(ids))if(key!=='unbound')await owner.query('INSERT INTO app.school_memberships(user_id,school_id) VALUES($1,$2)',[id,key.startsWith('foreign')?'other-school':school]);
  await t.test('school binding is idempotent; school switch and unassigned staff self-binding fail',async()=>{
    assert.equal((await run(ids.unbound,'SELECT app.bind_my_school($1) AS school',[school])).rows[0].school,school);
    await run(ids.unbound,'SELECT app.bind_my_school($1)',[school]);
    await assert.rejects(run(ids.unbound,"SELECT app.bind_my_school('other-school')"),deny('23514'));
    await assert.rejects(run(ids.teacher,"SELECT app.bind_my_school($1)",[school]),deny('42501'));
    const accounts=await run(ids.admin,'SELECT * FROM app.admin_accounts');
    assert(!accounts.rows.some(r=>r.id===ids.foreignAdmin));assert(!accounts.fields.some(f=>f.name==='password_hash'));
    assert.equal((await run(ids.studentA,'SELECT * FROM app.admin_accounts')).rowCount,0);
  });
  const caseId=(await owner.query(`INSERT INTO app.care_cases(student_id,teacher_id,school_id,student_label,risk_level,topic,consent_at)
    VALUES($1,$2,$3,'Masked student','high','Authorized summary',now()-interval '1 hour') RETURNING id`,[ids.studentA,ids.teacher,school])).rows[0].id;
  const otherCase=(await owner.query(`INSERT INTO app.care_cases(student_id,teacher_id,school_id,student_label,risk_level,topic,consent_at)
    VALUES($1,$2,$3,'Another student','low','Authorized summary',now()-interval '1 hour') RETURNING id`,[ids.studentB,ids.teacher,school])).rows[0].id;
  const payload={note:Buffer.from('encrypted-note-fixture').toString('base64'),plan:Buffer.from('encrypted-plan-fixture').toString('base64'),method:'in_person',nextDate:'2099-01-01'};
  const action=(user,id,v,op,p=payload,key=randomUUID())=>run(user,'SELECT app.teacher_case_action($1,$2,$3,$4,$5) AS version',[id,v,key,op,p]);
  await t.test('care scope requires school, assigned verified teacher and live consent',async()=>{
    assert.equal((await run(ids.teacher,'SELECT * FROM app.care_cases')).rowCount,2);
    for(const id of [ids.admin,ids.studentA,ids.teacher2,ids.foreignTeacher,null])assert.equal((await run(id,'SELECT * FROM app.care_cases')).rowCount,0);
    await owner.query('UPDATE app.care_cases SET consent_revoked_at=now() WHERE id=$1',[caseId]);
    await assert.rejects(action(ids.teacher,caseId,1,'review_follow_up'),deny('42501'));
    await owner.query('UPDATE app.care_cases SET consent_revoked_at=NULL,consent_at=now()+interval \'1 day\' WHERE id=$1',[caseId]);
    assert.equal((await run(ids.teacher,'SELECT * FROM app.care_cases WHERE id=$1',[caseId])).rowCount,0);
    await owner.query("UPDATE app.care_cases SET consent_at=now()-interval '1 hour' WHERE id=$1",[caseId]);
    await assert.rejects(owner.query('INSERT INTO app.wellbeing_snapshots(case_id,student_id,observed_on) VALUES($1,$2,current_date)',[caseId,ids.studentB]),deny('23514'));
  });
  await t.test('review/observation uses version and idempotency and private event history',async()=>{
    const key=randomUUID();
    assert.equal((await action(ids.teacher,caseId,1,'review_observe',payload,key)).rows[0].version,'2');
    assert.equal((await action(ids.teacher,caseId,1,'review_observe',payload,key)).rows[0].version,'2');
    await assert.rejects(action(ids.teacher,caseId,1,'review_follow_up'),deny('40001'));
    await assert.rejects(action(ids.teacher,caseId,2,'review_follow_up',payload,key),deny('23514'));
    assert.equal((await run(ids.admin,'SELECT * FROM app.care_case_events')).rowCount,0);
    await action(ids.teacher,otherCase,1,'review_follow_up');
  });
  let appointment;
  const book=(caseKey,start,id=null,v=null,key=randomUUID())=>run(ids.teacher,'SELECT app.save_care_appointment($1,$2,$3,$4,$5,45,\'in_person\',$6) AS id',[caseKey,id,v,key,start,Buffer.from('encrypted-location')]);
  await t.test('appointments reject overlaps across cases, midnight crossing and forged callers',async()=>{
    const key=randomUUID();appointment=(await book(caseId,'2099-01-01T10:00:00+08:00',null,null,key)).rows[0].id;
    assert.equal((await book(caseId,'2099-01-01T10:00:00+08:00',null,null,key)).rows[0].id,appointment);
    await assert.rejects(book(otherCase,'2099-01-01T10:30:00+08:00'),deny('23P01'));
    await assert.rejects(book(caseId,'2099-01-01T23:45:00+08:00'),deny('23514'));
    await assert.rejects(run(ids.teacher2,"SELECT app.save_care_appointment($1,NULL,NULL,$2,'2099-01-01 12:00+08',30,'phone',$3)",[caseId,randomUUID(),Buffer.from('test')]),deny('42501'));
    const logistics=await run(ids.studentA,'SELECT * FROM app.care_appointments');assert.equal(logistics.rowCount,1);
    assert(!logistics.fields.some(f=>['risk_level','summary_ciphertext','review_note_ciphertext'].includes(f.name)));
    assert.equal((await run(ids.studentB,'SELECT * FROM app.care_appointments')).rowCount,0);
  });
  await t.test('student response is private, cannot replay, re-invite clears prior response and preserves events',async()=>{
    await assert.rejects(run(ids.studentB,"SELECT app.respond_care_appointment($1,1,'accepted',NULL,NULL)",[appointment]),deny('42501'));
    await run(ids.studentA,"SELECT app.respond_care_appointment($1,1,'declined',NULL,$2)",[appointment,Buffer.from('encrypted-decline')]);
    await assert.rejects(run(ids.studentA,"SELECT app.respond_care_appointment($1,1,'accepted',NULL,NULL)",[appointment]),deny('40001'));
    await assert.rejects(run(ids.teacher,"SELECT app.finish_care_appointment($1,2,'completed')",[appointment]),deny('23514'));
    const key=randomUUID();
    await book(caseId,'2099-01-01T11:00:00+08:00',appointment,2,key);
    assert.equal((await book(caseId,'2099-01-01T11:00:00+08:00',appointment,2,key)).rows[0].id,appointment);
    await assert.rejects(book(caseId,'2099-01-01T12:00:00+08:00',appointment,2,key),deny('23514'));
    const row=(await run(ids.studentA,'SELECT * FROM app.care_appointments WHERE id=$1',[appointment])).rows[0];assert.equal(row.response_status,'pending');assert.equal(row.response_note_ciphertext,null);
    await run(ids.studentA,"SELECT app.respond_care_appointment($1,3,'accepted',NULL,NULL)",[appointment]);
    await assert.rejects(action(ids.teacher,caseId,2,'close'),deny('23514'));
    await run(ids.teacher,"SELECT app.finish_care_appointment($1,4,'completed')",[appointment]);
    assert.equal((await run(ids.studentA,'SELECT * FROM app.care_appointment_events')).rowCount,5);
    assert.equal((await run(ids.admin,'SELECT * FROM app.care_appointment_events')).rowCount,0);
  });
  await t.test('concurrent booking across cases permits exactly one overlapping appointment',async()=>{
    const clients=await Promise.all([connect('BACKEND_DATABASE_URL'),connect('BACKEND_DATABASE_URL')]);
    try {
      const results=await Promise.allSettled(clients.map(async(db,i)=>{
        await db.query('BEGIN');
        try {
          await db.query("SELECT set_config('app.user_id',$1,true),set_config('app.session_hash',$2,true)",[ids.teacher,digest(ids.teacher).toString('hex')]);
          const result=await db.query("SELECT app.save_care_appointment($1,NULL,NULL,$2,'2099-02-01 10:00+08',45,'phone',$3) AS id",[i?otherCase:caseId,randomUUID(),Buffer.from('encrypted-location')]);
          await db.query('COMMIT');return result.rows[0].id;
        }catch(e){await db.query('ROLLBACK');throw e;}
      }));
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.equal(results.find(r=>r.status==='rejected').reason.code,'23P01');
      await run(ids.teacher,"SELECT app.finish_care_appointment($1,1,'cancelled')",[results.find(r=>r.status==='fulfilled').value]);
    }finally{await Promise.all(clients.map(c=>c.end()));}
  });
  await t.test('case records, escalation recipient acknowledgement, close/reopen and history',async()=>{
    await action(ids.teacher,caseId,2,'record',{...payload,appointmentId:appointment});
    assert.equal((await run(ids.teacher,'SELECT observation_due_on FROM app.care_cases WHERE id=$1',[caseId])).rows[0].observation_due_on,null);
    await action(ids.teacher,caseId,3,'escalate',{...payload,recipientId:ids.teacher2,recipientLabel:'校内接收教师'});
    const escalation=(await run(ids.teacher2,'SELECT id FROM app.care_escalations')).rows[0].id;
    await assert.rejects(run(ids.teacher,'SELECT app.acknowledge_care_escalation($1)',[escalation]),deny('42501'));
    await assert.rejects(action(ids.teacher,caseId,4,'close'),deny('23514'));
    await run(ids.teacher2,'SELECT app.acknowledge_care_escalation($1)',[escalation]);
    await action(ids.teacher,caseId,4,'close');
    await assert.rejects(action(ids.teacher,caseId,5,'record'),deny('23514'));
    await action(ids.teacher,caseId,5,'reopen',{});
    assert.equal((await run(ids.teacher,'SELECT * FROM app.care_records')).rowCount,1);
    for(const id of [ids.admin,ids.studentA,ids.teacher2])assert.equal((await run(id,'SELECT * FROM app.care_records')).rowCount,0);
  });
  await t.test('school feedback, images, notice draft isolation and audit omit bodies',async()=>{
    const f=(await run(ids.studentA,'INSERT INTO app.student_feedback(school_id,student_id,body,request_key) VALUES($1,$2,\'Feedback example\',$3) RETURNING id',[school,ids.studentA,randomUUID()])).rows[0].id;
    assert.equal((await run(ids.studentB,'SELECT * FROM app.student_feedback')).rowCount,0);
    assert.equal((await run(ids.foreignAdmin,'SELECT * FROM app.student_feedback')).rowCount,0);
    await assert.rejects(run(ids.studentA,"INSERT INTO app.student_feedback(school_id,student_id,images,request_key) VALUES($1,$2,'[\"data:image/png;base64,abc\"]',$3)",[school,ids.studentA,randomUUID()]),deny('23514'));
    await run(ids.admin,"UPDATE app.student_feedback SET status='replied',reply='Fixed',replied_by=$2,version=2 WHERE id=$1",[f,ids.admin]);
    await assert.rejects(run(ids.admin,"UPDATE app.student_feedback SET status='processing',version=3 WHERE id=$1",[f]),deny('23514'));
    const n=(await run(ids.admin,"INSERT INTO app.campus_notices(school_id,notice_type,title,detail,status,created_by) VALUES($1,'campus','Title','Notice body','draft',$2) RETURNING id",[school,ids.admin])).rows[0].id;
    assert.equal((await run(ids.studentA,'SELECT * FROM app.public_campus_notices')).rowCount,0);
    await run(ids.admin,"UPDATE app.campus_notices SET status='published',version=2 WHERE id=$1",[n]);
    assert.equal((await run(ids.studentA,'SELECT * FROM app.public_campus_notices')).rowCount,1);
    assert.equal((await run(ids.foreignAdmin,'SELECT * FROM app.public_campus_notices')).rowCount,0);
    await run(ids.admin,"UPDATE app.campus_notices SET status='draft',version=3 WHERE id=$1",[n]);
    assert.equal((await run(ids.studentA,'SELECT * FROM app.public_campus_notices')).rowCount,0);
    assert((await run(ids.admin,'SELECT metadata FROM app.audit_logs')).rows.every(r=>JSON.stringify(r.metadata)==='{}'));
  });
  await t.test('student shop requires grant, owner uniqueness and independent moderation',async()=>{
    await assert.rejects(run(ids.studentA,"SELECT app.save_student_shop(NULL,NULL,'My shop','Dorm','9-18','Test',true)"),deny('42501'));
    await run(ids.admin,'SELECT app.admin_shop_permission($1,true)',[ids.studentA]);
    const s=(await run(ids.studentA,"SELECT app.save_student_shop(NULL,NULL,'My shop','Dorm','9-18','Test',true) AS id")).rows[0].id;
    await assert.rejects(run(ids.studentA,"SELECT app.save_student_shop(NULL,NULL,'Duplicate','Dorm','9-18','',true)"),deny('23505'));
    await run(ids.admin,'SELECT app.admin_suspend_shop($1,1,true)',[s]);
    await run(ids.studentA,"SELECT app.save_student_shop($1,2,'Changed shop','Dorm','9-18','',false)",[s]);
    let row=(await owner.query('SELECT * FROM app.stores WHERE id=$1',[s])).rows[0];assert.equal(row.admin_suspended,true);assert.equal(row.is_open,true);
    const order=()=>owner.query('INSERT INTO app.shop_orders(buyer_id,store_id,total_cents,request_key) VALUES($1,$2,100,$3)',[ids.studentB,s,randomUUID()]);
    await assert.rejects(order(),deny('23514'));
    await run(ids.admin,'SELECT app.admin_suspend_shop($1,3,false)',[s]);await order();
    assert.equal((await run(ids.foreignAdmin,'SELECT * FROM app.shop_orders WHERE store_id=$1',[s])).rowCount,0);
    await run(ids.admin,'SELECT app.admin_shop_permission($1,false)',[ids.studentA]);await assert.rejects(order(),deny('23514'));
    await assert.rejects(run(ids.studentA,"SELECT app.save_student_shop($1,4,'Changed','Dorm','9-18','',true)",[s]),deny('42501'));
    await assert.rejects(run(ids.foreignAdmin,'SELECT app.admin_suspend_shop($1,4,true)',[s]),deny('42501'));
    assert.equal((await owner.query('SELECT count(*) FROM app.shop_orders WHERE store_id=$1',[s])).rows[0].count,'1');
  });
  await t.test('reports are unique, aggregate priority, protect identities and hide deleted posts everywhere',async()=>{
    const post=(await owner.query("INSERT INTO app.wall_posts(school_id,author_id,content,title,is_anonymous,status) VALUES($1,$2,'Public evidence','Reported',true,'published') RETURNING id",[school,ids.studentA])).rows[0].id;
    for(const student of [ids.studentB,ids.studentC,ids.unbound])await run(student,'SELECT app.report_public_post($1,\'其他\')',[post]);
    await assert.rejects(run(ids.studentB,'SELECT app.report_public_post($1,\'其他\')',[post]),deny('23505'));
    const queue=await run(ids.admin,'SELECT * FROM app.admin_post_queue WHERE id=$1',[post]);assert.equal(queue.rows[0].pending_reports,'3');assert.equal(queue.rows[0].priority,true);assert(!queue.fields.some(f=>f.name==='author_id'));
    assert.equal((await run(ids.admin,'SELECT * FROM app.post_reports')).rowCount,0);
    await assert.rejects(run(ids.foreignAdmin,"SELECT app.moderate_public_post($1,1,$2,'delete','Reason')",[post,randomUUID()]),deny('42501'));
    await run(ids.admin,"SELECT app.moderate_public_post($1,1,$2,'keep','Reason')",[post,randomUUID()]);
    assert.equal((await run(ids.admin,'SELECT pending_reports FROM app.admin_post_queue WHERE id=$1',[post])).rows[0].pending_reports,'0');
    await owner.query("INSERT INTO app.wall_comments(post_id,author_id,content,status) VALUES($1,$2,'Comment','published')",[post,ids.studentB]);
    const key=randomUUID();const decision=await run(ids.admin,"SELECT app.moderate_public_post($1,2,$2,'delete','Rule violation') AS id",[post,key]);
    assert.equal((await run(ids.admin,"SELECT app.moderate_public_post($1,2,$2,'delete','Rule violation') AS id",[post,key])).rows[0].id,decision.rows[0].id);
    for(const user of [ids.studentA,ids.studentB,ids.admin])assert.equal((await run(user,'SELECT * FROM app.wall_public_posts WHERE id=$1',[post])).rowCount,0);
    assert.equal((await run(ids.studentB,'SELECT * FROM app.wall_public_comments WHERE post_id=$1',[post])).rowCount,0);
    assert.equal((await run(ids.studentB,'SELECT * FROM app.wall_comments WHERE post_id=$1',[post])).rowCount,0);
    const evidence=(await run(ids.admin,'SELECT evidence FROM app.post_moderation_decisions WHERE id=$1',[decision.rows[0].id])).rows[0].evidence;assert.equal(evidence.content,'Public evidence');assert(!('author_id' in evidence));
    const privatePost=(await owner.query("INSERT INTO app.wall_posts(school_id,author_id,content,visibility,status) VALUES($1,$2,'Private','private','published') RETURNING id",[school,ids.studentA])).rows[0].id;
    await assert.rejects(run(ids.admin,"SELECT app.moderate_public_post($1,1,$2,'delete','Reason')",[privatePost,randomUUID()]),deny('42501'));
  });
  await t.test('account administration denies cross-school, self-demotion and invalidates changed roles',async()=>{
    const created=randomUUID();
    const args=[created,'New-Teacher','New teacher','teacher','test-hash-not-for-login',Buffer.from('test'),digest(created)];
    await assert.rejects(run(ids.studentA,'SELECT app.admin_create_account($1,$2,$3,$4,$5,$6,$7)',args),deny('42501'));
    await run(ids.admin,'SELECT app.admin_create_account($1,$2,$3,$4,$5,$6,$7)',args);
    const account=(await run(ids.admin,'SELECT * FROM app.admin_accounts WHERE id=$1',[created])).rows[0];
    assert.equal(account.login_account,'new-teacher');assert.equal(account.school_id,school);
    await assert.rejects(run(ids.admin,'DELETE FROM app.users WHERE id=$1',[created]),deny('42501'));
    await assert.rejects(run(ids.admin,"SELECT app.admin_update_account($1,1,'Me','guest','active')",[ids.admin]),deny('23514'));
    await assert.rejects(run(ids.foreignAdmin,"SELECT app.admin_update_account($1,1,'Other','admin','disabled')",[ids.admin]),deny('42501'));
    await assert.rejects(run(ids.admin,"UPDATE app.users SET role='guest' WHERE id=$1",[ids.admin2]),deny('42501'));
    await run(ids.admin,"SELECT app.admin_update_account($1,1,'Former admin','guest','active')",[ids.admin2]);
    assert.equal((await owner.query('SELECT * FROM app.auth_sessions WHERE user_id=$1',[ids.admin2])).rowCount,0);
    await assert.rejects(run(ids.admin,"SELECT app.admin_update_account($1,1,'Again','guest','active')",[ids.admin2]),deny('40001'));
    await run(ids.admin,"SELECT app.admin_update_account($1,1,'Disabled teacher','teacher','disabled')",[ids.teacher]);
    assert.equal((await run(ids.teacher,'SELECT * FROM app.care_cases')).rowCount,0);
    for(const name of ['care_cases','care_records','care_appointments','care_case_events','care_escalations','student_feedback','post_reports','post_moderation_decisions'])await assert.rejects(agent.query(`SELECT * FROM app.${name}`),deny('42501'));
  });
}
