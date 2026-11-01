import {protectedApi} from '../../../lib/protected-api';
import {provinces,getLocalities} from '../../../db/geography.mjs';
function handleGET(request:Request){const province=new URL(request.url).searchParams.get('provincia');return Response.json(province?getLocalities(province):provinces,{headers:{'Cache-Control':'public, max-age=86400'}});}

export const GET=protectedApi(handleGET);
