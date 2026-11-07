import test from 'node:test';import assert from 'node:assert/strict';
import {buildStatistics,monthlySeries} from '../public/statistics-model.js';
const accounts=[
 {courseId:'web',courseName:'Web anterior',enrollmentDate:'2026-09-01',feeCents:10000,paidCents:4000,balanceCents:6000,paymentStatus:'partial'},
 {courseId:'web',courseName:'Web anterior',enrollmentDate:'2026-10-02',feeCents:10000,paidCents:10000,balanceCents:0,paymentStatus:'paid'},
 {courseId:'retired',courseName:'Curso retirado',enrollmentDate:'2026-10-03',feeCents:null,paidCents:0,balanceCents:null,paymentStatus:'undefined'}
];
test('estadísticas agrupan por identidad y conservan cursos fuera del catálogo',()=>{const s=buildStatistics(accounts,[{id:'web',name:'Desarrollo web'},{id:'sql',name:'SQL'}]);assert.equal(s.total,3);assert.equal(s.activeCourses,2);assert.equal(s.withEnrollments,2);assert.equal(s.rows.find(c=>c.id==='web').count,2);assert.equal(s.rows.find(c=>c.id==='retired').active,false);assert.equal(s.rows.find(c=>c.id==='sql').count,0);assert.equal(s.paidCents,14000);assert.equal(s.pendingCents,6000);assert.equal(s.undefinedCount,1);});
test('período inclusivo filtra por matrícula y conserva el estado actual de cobro',()=>{const s=buildStatistics(accounts,[],{from:'2026-10-02',to:'2026-10-02'});assert.equal(s.total,1);assert.equal(s.paidCents,10000);assert.equal(s.pendingCents,0);assert.equal(s.states.paid,1);assert.deepEqual(s.months,[['2026-10',1]]);});
test('período vacío devuelve ceros y nunca inventa datos',()=>{const s=buildStatistics(accounts,[],{from:'2027-01-01'});assert.equal(s.total,0);assert.equal(s.paidCents,0);assert.equal(s.pendingCents,0);assert.deepEqual(s.months,[]);});
test('serie mensual completa meses sin inscripciones y respeta cambio de año y límite',()=>{assert.deepEqual(monthlySeries([['2025-12',2],['2026-02',3]]),[['2025-12',2],['2026-01',0],['2026-02',3]]);assert.deepEqual(monthlySeries([['2025-12',2],['2026-02',3]],2),[['2026-01',0],['2026-02',3]]);assert.deepEqual(monthlySeries([]),[]);});
