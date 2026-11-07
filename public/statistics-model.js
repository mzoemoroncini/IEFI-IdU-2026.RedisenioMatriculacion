import {courseInfo} from './catalog.js';
export function buildStatistics(accounts,courses,{from='',to=''}={}){
 const selected=accounts.filter(a=>(!from||a.enrollmentDate>=from)&&(!to||a.enrollmentDate<=to));
 const grouped=new Map(courses.map(c=>[c.id,{id:c.id,name:c.name,active:true,count:0,paidCents:0,pendingCents:0,undefinedCount:0,area:courseInfo(c).area}]));
 const months=new Map(),states={paid:0,partial:0,pending:0,exempt:0,undefined:0};
 for(const a of selected){if(!grouped.has(a.courseId))grouped.set(a.courseId,{id:a.courseId,name:a.courseName,active:false,count:0,paidCents:0,pendingCents:0,undefinedCount:0,area:courseInfo({id:a.courseId}).area});const c=grouped.get(a.courseId);c.count++;c.paidCents+=a.paidCents;c.pendingCents+=a.balanceCents||0;c.undefinedCount+=Number(a.feeCents===null);months.set(a.enrollmentDate.slice(0,7),(months.get(a.enrollmentDate.slice(0,7))||0)+1);if(Object.hasOwn(states,a.paymentStatus))states[a.paymentStatus]++;}
 const rows=[...grouped.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'es'));
 return {total:selected.length,activeCourses:courses.length,withEnrollments:rows.filter(c=>c.count).length,paidCents:selected.reduce((s,a)=>s+a.paidCents,0),pendingCents:selected.reduce((s,a)=>s+(a.balanceCents||0),0),undefinedCount:states.undefined,rows,months:[...months].sort(([a],[b])=>a.localeCompare(b)),states};
}

export function monthlySeries(months,limit=12){if(!months.length)return [];const values=new Map(months),first=months[0][0],last=months.at(-1)[0],cursor=new Date(last+'-01T12:00:00Z'),result=[];for(let i=0;i<limit;i++){const key=cursor.toISOString().slice(0,7);if(key<first)break;result.unshift([key,values.get(key)||0]);cursor.setUTCMonth(cursor.getUTCMonth()-1)}return result;}

export function statisticsPeriod(key,today){
 const year=Number(today.slice(0,4)),month=Number(today.slice(5,7));
 if(key==='all')return {from:'',to:''};
 if(key==='month')return {from:today.slice(0,7)+'-01',to:today};
 if(key==='year')return {from:year+'-01-01',to:today};
 if(key==='quarter'){const start=new Date(Date.UTC(year,month-3,1,12));return {from:start.toISOString().slice(0,10),to:today};}
 throw Error('Período no válido');
}
