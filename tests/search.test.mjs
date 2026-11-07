import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesQuery,optionMatches} from '../public/search-utils.js';
test('busca sin tildes y por palabras en cualquier orden',()=>{
 assert.equal(matchesQuery('Córdoba · Programación con Python','PYTHON cordoba'),true);
 assert.equal(matchesQuery('Diseño web','  diseno   WEB '),true);
 assert.equal(matchesQuery('Pilar',''),true);
 assert.equal(matchesQuery('Pilar','rosario'),false);
});
test('filtra todas las opciones antes de limitar resultados y omite deshabilitadas',()=>{
 const options=Array.from({length:100},(_,i)=>({label:'Curso '+i,disabled:i===99}));
 assert.equal(optionMatches(options,'').count,99);
 assert.equal(optionMatches(options,'').options.length,60);
 assert.equal(optionMatches(options,'98').options[0].label,'Curso 98');
 assert.equal(optionMatches(options,'99').count,0);
});
