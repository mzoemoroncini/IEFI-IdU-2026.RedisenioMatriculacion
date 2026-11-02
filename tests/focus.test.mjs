import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreFocus} from '../public/focus.js';
function control(overrides={}) { return {isConnected:true,disabled:false,closest:()=>null,focus(){this.focused=true;},...overrides}; }
test('Cerrar una ventana devuelve el foco al control que la abrió',()=>{const trigger=control(),fallback=control();assert.equal(restoreFocus(trigger,fallback),trigger);assert.equal(trigger.focused,true);assert.equal(fallback.focused,undefined);});
test('Una fila reemplazada, oculta o deshabilitada usa un destino estable',()=>{for(const overrides of [{isConnected:false},{disabled:true},{closest:()=>({hidden:true})}]){const fallback=control();assert.equal(restoreFocus(control(overrides),fallback),fallback);assert.equal(fallback.focused,true);}});
test('No intenta enfocar un destino eliminado u oculto',()=>{assert.equal(restoreFocus(null,control({isConnected:false})),null);assert.equal(restoreFocus(null,null),null);});
