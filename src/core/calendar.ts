export const gameDate=(day:number)=>new Date(Date.UTC(2027,0,4+day));
export const dateDay=(year:number,month:number,day:number)=>Math.round((Date.UTC(year,month-1,day)-Date.UTC(2027,0,4))/86400000);
export const seasonOf=(day:number)=>gameDate(day).getUTCFullYear();
export const yearEnd=(year:number)=>dateDay(year,12,31);
export const isoDay=(day:number)=>gameDate(day).toISOString().slice(0,10);
