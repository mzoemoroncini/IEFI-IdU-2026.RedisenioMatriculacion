import geography from '../data/geography.json' with {type:'json'};
export const provinces=geography.provinces;
export const placeKey=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').trim().replace(/\s+/gu,' ').toLowerCase();
export function getLocalities(provinceId) {
  return geography.localities[provinceId]||[];
}
export function resolveLocation(provinceId,localityId) {
  const province=provinces.find(item=>item.id===provinceId);
  const locality=getLocalities(provinceId).find(item=>item.id===localityId);
  return province&&locality?{provinceId:province.id,provinceName:province.name,localityId:locality.id,locality:locality.name}:null;
}
