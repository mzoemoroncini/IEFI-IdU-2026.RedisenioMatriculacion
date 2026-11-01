import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
function adapter(sqlite){
 return {
  prepare(sql){return {bind(...values){return {...this,values};},async all(){return this.execute();},async first(){return sqlite.prepare(sql).get(...(this.values||[]))||null;},execute(){const statement=sqlite.prepare(sql);return /^\s*SELECT/i.test(sql)?{results:statement.all(...(this.values||[])),meta:{changes:0}}:{results:[],meta:{changes:Number(statement.run(...(this.values||[])).changes)}};}};},
  async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(statement=>statement.execute());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}
 };
}
function database(path=':memory:'){const sqlite=new DatabaseSync(path);for(const file of readdirSync(new URL('../../drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../../drizzle/'+file,import.meta.url),'utf8'));return sqlite;}

export {adapter,database};
