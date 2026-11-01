import {provinces,getLocalities} from '../../../db/geography.mjs';
export function GET(request:Request){const province=new URL(request.url).searchParams.get('provincia');return Response.json(province?getLocalities(province):provinces,{headers:{'Cache-Control':'public, max-age=86400'}});}
