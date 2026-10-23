import { readFileSync, writeFileSync } from 'node:fs';
import { render, peopleFor, kkey } from './prototype/studio/engine/render.ts';
import { diff, validate } from './prototype/studio/engine/validate.ts';
import { canonical, sha256 } from './prototype/contracts/rules.ts';

const clone = (x: any) => JSON.parse(JSON.stringify(x));
const base: any = {
  contract_version: 'combination-config/v0',
  composition: { key: 'test-leaf', label: 'Review fixture', program: 'Program fixture', pathway: 'Pathway fixture', participants: [{ role: 'principal', label: 'Principal', min: 1, max: 1 }], source_basis: 'ILLUSTRATIVE', basis_note: 'Independent review fixture' },
  mode: 'draft', canonical_fields: [{id:'person.field_a',meaning:'Field A',value_type:'text'}],
  sections: [{id:'section-a',title:'Section A'}],
  placements: [{lineage:'place-a',fact:'person.field_a',section_id:'section-a',collected_from:'client_questionnaire',repeats:'per_person',client_visible:true}],
  forms: [], field_maps: [], document_requirements: [], rules: [], checks: [],
  document_types: [{key:'type-a',name:'Document type A',supplies_facts:[],reader_profile:null}],
  derived_fields: [{id:'derived-a',calculation:'unimplemented',inputs:[],reference:'',executable:false}], row_versions:{}
};
const people=peopleFor(base.composition.participants);
const result: any = { scope:'Offline probes on frozen current working source, no database/browser/model calls', probes:[] };
const add=(id:string,observed:any,expected:string,defect:boolean)=>result.probes.push({id,observed,expected,defect});

// Observe selected-section behavior; exact pruning policy needs reconciliation.
let view=render(base,people,new Map());
add('selected-section-question',{configured:base.placements.length,returned:view.questions.length},'Reconcile configured-section intent with unused-question pruning; this observation alone is not a confirmed material defect',false);
const mapped=clone(base);
mapped.forms=[{form_number:'FORM-A',title:'Form A',who:'principal_applicant',status:'always',condition:null}];
mapped.field_maps=[{form_number:'FORM-A',form_edition:'FORM-A-v1',entries:[{data_path:'box-a',outcome:'mapped',fact:'person.field_a',person:'form_subject',row:null}]}];
view=render(mapped,people,new Map());
add('mapped-question-control',{returned:view.questions.map((x:any)=>x.fact)},'The same question is returned when a form map reads it',false);

// A conditional question needs its deciding input, not a circular requirement for an unseen answer.
const conditional=clone(mapped);
conditional.canonical_fields.push({id:'person.condition_flag',meaning:'Condition flag',value_type:'yes_no'});
conditional.placements.push({lineage:'place-flag',fact:'person.condition_flag',section_id:'section-a',collected_from:'client_questionnaire',repeats:'per_person',client_visible:true});
conditional.placements[0].condition={subjectKind:'PRINCIPAL',op:'eq',field:'person.condition_flag',value:true};
conditional.placements[0].condition_effect='SHOW';
const waiting=render(conditional,people,new Map());
const supplied=render(conditional,people,new Map([[kkey('principal','person.condition_flag'),{value:true,status:'answered',source:'review probe'}]]));
add('question-condition-dependency',{waiting_questions:waiting.questions.map((q:any)=>({fact:q.fact,status:q.status})),deciders:waiting.deciders,after_external_answer:supplied.questions.map((q:any)=>({fact:q.fact,status:q.status}))},'The configured deciding question is available before its dependent question needs it',!waiting.questions.some((q:any)=>q.fact==='person.condition_flag')&&!waiting.deciders.some((q:any)=>q.fact==='person.condition_flag'));

const hidden=clone(conditional);
hidden.placements[0].condition_effect='HIDE';
const hiddenView=render(hidden,people,new Map([[kkey('principal','person.condition_flag'),{value:true,status:'answered',source:'review probe'}]]));
const hiddenProblems=validate(hidden,hidden.canonical_fields.map((f:any)=>({key:f.id,valueType:f.value_type})),[]);
add('publish-hide-required-form-input',{form_applies:hiddenView.forms[0].applies,question_status:hiddenView.questions.find((q:any)=>q.fact==='person.field_a')?.status,validation_problems:hiddenProblems},'W1 3.4 blocks publishing a placement that hides a field read by an applicable form; this offline probe tests the publication validator, not a database release',hiddenView.forms[0].applies===true&&hiddenView.questions.some((q:any)=>q.fact==='person.field_a'&&q.status==='hidden by a condition')&&!hiddenProblems.some((p:any)=>p.level==='error'));

for(const [id,mutate] of [
  ['participant-change',(s:any)=>{s.composition.participants.push({role:'spouse_or_partner',label:'Partner',min:1,max:1})}],
  ['document-supply-change',(s:any)=>{s.document_types[0].supplies_facts=['person.field_a']}],
  ['derived-definition-change',(s:any)=>{s.derived_fields[0].inputs=['person.field_a']}],
] as const){
  const before=clone(base);
  before.document_requirements.push({lineage:'existing-requirement',document_type:'Document type A',document_type_key:'type-a',who:'principal_applicant',base_or_conditional:'base'});
  const after=clone(before);mutate(after);
  const changes=diff(before,after);
  add(id,{content_hash_changed:sha256(canonical(before))!==sha256(canonical(after)),review_change_items:changes},'A behavior-bearing configuration change appears in the review change set',changes.length===0);
}
const req=clone(base);req.document_requirements.push({lineage:'requirement-a',document_type:'Document type A',who:'principal_applicant',base_or_conditional:'base'});
add('ordinary-change-control',{review_change_items:diff(base,req)},'A document requirement appears in the review change set',false);

const demo=readFileSync('./prototype/studio/api/src/demo.ts','utf8');
const samples=demo.slice(demo.indexOf('export const SAMPLE_PROGRAMS = ['),demo.indexOf('\n];',demo.indexOf('export const SAMPLE_PROGRAMS = [')));
const programCount=(samples.match(/\{ program: \{/g)||[]).length;
const compositionCount=(samples.match(/\{ key: "(?:wp|vv|sv)\./g)||[]).length;
add('five-program-fixture',{programs:programCount,compositions:compositionCount},'D274/D275 require five sample programs; family variants are not extra programs',programCount!==5);

const lib=base.canonical_fields.map((f:any)=>({key:f.id,valueType:f.value_type}));
add('declared-questions-validation',{problems:validate(base,lib,[])},'No invalid source reference is necessary to reproduce the missing selected-section question',false);
result.summary={probes:result.probes.length,defect_observations:result.probes.filter((p:any)=>p.defect).length};
writeFileSync('./alignment-probe-results.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
