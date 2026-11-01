import { COURSES } from '../../../public/rules.js';
export function GET() { return Response.json(COURSES,{headers:{'Cache-Control':'no-store'}}); }
