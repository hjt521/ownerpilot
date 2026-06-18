import { normalizeBankName } from './bankNames';
import { formatUsPhone, isStandardUsPhone } from './phoneFormat';
import { validateTenantName, sanitizeTenantName, validateTenantNames } from './tenantNameValidation';
import { bankDepositMethodHelper, bankDepositMethodDisclosure, bankDepositMethodCopyVersion } from './bankDepositDisclosureCopy';

let pass=0; const fail:string[]=[];
const eq=(l:string,g:any,w:any)=>{ if(g===w)pass++; else fail.push(`${l}\n   got:  ${JSON.stringify(g)}\n   want: ${JSON.stringify(w)}`); };
const ok=(l:string,c:boolean)=>{ if(c)pass++; else fail.push(l); };

// --- bank names ---
eq('chase','Chase Bank',normalizeBankName('chase'));
eq('CHASE trim',normalizeBankName('  CHASE  '),'Chase Bank');
eq('jpmorgan',normalizeBankName('jpmorgan chase'),'JPMorgan Chase Bank, N.A.');
eq('bofa',normalizeBankName('bofa'),'Bank of America');
eq('wells',normalizeBankName('wells fargo'),'Wells Fargo Bank');
eq('citi',normalizeBankName('citi'),'Citibank');
eq('us bank',normalizeBankName('us bank'),'U.S. Bank');
eq('pnc',normalizeBankName('pnc'),'PNC Bank');
eq('unknown title-case',normalizeBankName('first national of glendale'),'First National Of Glendale');
eq('unknown keeps acronym',normalizeBankName('BMO harris'),'BMO Harris');
eq('empty',normalizeBankName('  '),'');

// --- phone ---
eq('10-digit',formatUsPhone('3232514490'),'(323) 251-4490');
eq('1+10',formatUsPhone('13232514490'),'(323) 251-4490');
eq('already formatted',formatUsPhone('(323) 251-4490'),'(323) 251-4490');
eq('dashes',formatUsPhone('323-251-4490'),'(323) 251-4490');
eq('non-standard kept',formatUsPhone('12345'),'12345');
ok('isStandard true',isStandardUsPhone('3232514490'));
ok('isStandard false',!isStandardUsPhone('12345'));

// --- tenant names ---
eq('trim+comma',sanitizeTenantName(' ,Jason Short, '),'Jason Short');
eq('collapse spaces',sanitizeTenantName('Jason   Short'),'Jason Short');
eq('real name ok',validateTenantName('Jason Short').level,'ok');
eq('hyphen ok',validateTenantName('Mary-Jane O\u2019Brien').level,'ok');
eq('initial ok',validateTenantName('J. R. Smith').level,'ok');
eq('empty blocks',validateTenantName('   ').level,'block');
eq('leading punct',validateTenantName(',jn knkl').level,'warn');
eq('leading punct msg',validateTenantName('!Bob').level,'warn');
eq('kbmash',validateTenantName('kjhlk kljkl').level,'warn');
eq('asdf',validateTenantName('asdf').level,'warn');
eq('test',validateTenantName('test').level,'warn');
eq('tenant word',validateTenantName('tenant').level,'warn');
eq('xxx',validateTenantName('xxx').level,'warn');
eq('symbols',validateTenantName('!!!!').level,'warn');
ok('multi clean',(()=>{const r=validateTenantNames(['Jason Short',' ,Maria Lopez ']);return r.cleaned.join(', ')==='Jason Short, Maria Lopez' && !r.blocking;})());
ok('all empty blocks',validateTenantNames(['',' ']).blocking===true);

// --- locked copy spot checks ---
ok('copy version v1',bankDepositMethodCopyVersion==='v1');
ok('helper mentions 1161(2)',bankDepositMethodHelper.includes('\u00A7 1161(2)') && bankDepositMethodHelper.includes('dedicated rent-collection account'));
ok('disclosure two options',bankDepositMethodDisclosure.includes('1. Skip bank deposit') && bankDepositMethodDisclosure.includes('2. Use a dedicated rent-collection account') && bankDepositMethodDisclosure.includes('not legal advice'));
ok('disclosure no masking claim',bankDepositMethodDisclosure.includes('does not satisfy the requirement'));

if(fail.length){console.error(`inputHelpers.test.ts: ${fail.length} FAILED`);fail.forEach(f=>console.error('  - '+f));process.exit(1);}
console.log(`inputHelpers.test.ts: all ${pass} checks passed`);
