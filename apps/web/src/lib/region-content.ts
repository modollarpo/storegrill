import { DEFAULT_REGIONS, type RegionConfig } from '@Storegrill/shared';
import { DEFAULT_REGION_KEY } from './regions';

export function regionConfig(key: string): RegionConfig {
  return DEFAULT_REGIONS.find(r => r.key === key) ?? DEFAULT_REGIONS[0];
}

export function defaultConfig(): RegionConfig {
  return regionConfig(DEFAULT_REGION_KEY);
}

interface LawInfo {
  act: string;
  authority: string;
  authorityUrl: string;
  courts: string;
  jurisdictionNote: string;
}

const LAW_MAP: Record<string, LawInfo> = {
  US: { act: 'California Consumer Privacy Act (CCPA/CPRA) and applicable state privacy laws', authority: 'Federal Trade Commission', authorityUrl: 'https://www.ftc.gov', courts: 'state and federal courts of the State of Delaware', jurisdictionNote: 'US consumers' },
  CA: { act: 'Personal Information Protection and Electronic Documents Act (PIPEDA)', authority: 'Office of the Privacy Commissioner of Canada', authorityUrl: 'https://www.priv.gc.ca', courts: 'courts of the Province of Ontario', jurisdictionNote: 'Canadian consumers' },
  UK: { act: 'UK GDPR and the Data Protection Act 2018', authority: 'Information Commissioner\'s Office (ICO)', authorityUrl: 'https://ico.org.uk', courts: 'courts of England and Wales', jurisdictionNote: 'UK consumers' },
  IE: { act: 'GDPR and the Data Protection Acts 1988–2018', authority: 'Data Protection Commission', authorityUrl: 'https://www.dataprotection.ie', courts: 'courts of Ireland', jurisdictionNote: 'Irish consumers' },
  DE: { act: 'GDPR and the Bundesdatenschutzgesetz (BDSG)', authority: 'Die Datenschutzbeauftragten', authorityUrl: 'https://www.datenschutzkonferenzonline.de', courts: 'German courts', jurisdictionNote: 'consumers in Germany, Austria and Switzerland' },
  FR: { act: 'GDPR and the Loi Informatique et Libertés', authority: 'CNIL', authorityUrl: 'https://www.cnil.fr', courts: 'French courts', jurisdictionNote: 'French consumers' },
  CH: { act: 'Revised Federal Act on Data Protection (revFADP)', authority: 'Federal Data Protection and Information Commissioner (FDPIC)', authorityUrl: 'https://www.edoeb.admin.ch', courts: 'Swiss courts', jurisdictionNote: 'Swiss consumers' },
  AU: { act: 'Privacy Act 1988 and the Australian Privacy Principles', authority: 'Office of the Australian Information Commissioner (OAIC)', authorityUrl: 'https://www.oaic.gov.au', courts: 'courts of New South Wales', jurisdictionNote: 'Australian consumers' },
  JP: { act: 'Act on the Protection of Personal Information (APPI)', authority: 'Personal Information Protection Commission (PPC)', authorityUrl: 'https://www.ppc.go.jp', courts: 'Tokyo District Court', jurisdictionNote: 'Japanese consumers' },
  IN: { act: 'Digital Personal Data Protection Act, 2023 (DPDP)', authority: 'Data Protection Board of India', authorityUrl: 'https://www.meity.gov.in', courts: 'courts of India', jurisdictionNote: 'Indian consumers' },
  AE: { act: 'Federal Decree-Law No. 45 of 2021 (PDPL)', authority: 'UAE Data Office', authorityUrl: 'https://u.ae', courts: 'courts of the Emirate of Dubai', jurisdictionNote: 'UAE consumers' },
  NG: { act: 'Nigeria Data Protection Act, 2023 (NDPA) and the NDPC General Application and Implementation Directive', authority: 'Nigeria Data Protection Commission (NDPC)', authorityUrl: 'https://ndpc.gov.ng', courts: 'High Courts of the Federal Republic of Nigeria', jurisdictionNote: 'Nigerian consumers' },
  GH: { act: 'Data Protection Act, 2012 (Act 843)', authority: 'Data Protection Commission of Ghana', authorityUrl: 'https://www.dataprotection.org.gh', courts: 'courts of Ghana', jurisdictionNote: 'Ghanaian consumers' },
  KE: { act: 'Data Protection Act, 2019', authority: 'Office of the Data Protection Commissioner (ODPC)', authorityUrl: 'https://www.odpc.go.ke', courts: 'courts of Kenya', jurisdictionNote: 'Kenyan consumers' },
  UG: { act: 'Data Protection and Privacy Act, 2019', authority: 'Personal Data Protection Office (PDPO)', authorityUrl: 'https://ppdpo.go.ug', courts: 'courts of Uganda', jurisdictionNote: 'Ugandan consumers' },
  ZA: { act: 'Protection of Personal Information Act, 2013 (POPIA)', authority: 'Information Regulator of South Africa', authorityUrl: 'https://inforegulator.org.za', courts: 'courts of the Republic of South Africa', jurisdictionNote: 'South African consumers' },
  EG: { act: 'Data Protection Law No. 152 of 2020', authority: 'Egyptian Data Protection Centre', authorityUrl: 'https://www.mcit.gov.eg', courts: 'courts of the Arab Republic of Egypt', jurisdictionNote: 'Egyptian consumers' },
  MA: { act: 'Law No. 09-08 on the protection of individuals with regard to personal data processing', authority: 'CNDP Maroc', authorityUrl: 'https://www.cndp.ma', courts: 'courts of the Kingdom of Morocco', jurisdictionNote: 'Moroccan consumers' },
  TZ: { act: 'Personal Data Protection Act, 2022', authority: 'Personal Data Protection Commission of Tanzania', authorityUrl: 'https://www.pdpc.go.tz', courts: 'courts of the United Republic of Tanzania', jurisdictionNote: 'Tanzanian consumers' },
};

const FALLBACK_LAW: LawInfo = {
  act: 'applicable local data protection legislation',
  authority: 'the competent national data protection authority',
  authorityUrl: '/contact',
  courts: 'the courts of your country of residence',
  jurisdictionNote: 'consumers in your region',
};

export function lawFor(regionKey: string): LawInfo {
  return LAW_MAP[regionKey] ?? FALLBACK_LAW;
}

export function supportEmailFor(regionKey: string): string {
  return `${regionKey.toLowerCase()}@support.storegrill.net`;
}

export interface RegionPromoContent {
  currency: string;
  freeShippingThresholdMinorUnits: number;
  couponCode: string;
  couponDiscountPercent: number;
  cashbackPercent: number;
}

export function regionPromoContent(regionKey: string): RegionPromoContent {
  const config = regionConfig(regionKey);
  return {
    currency: config.defaultCurrency,
    freeShippingThresholdMinorUnits: config.freeShippingThresholdMinorUnits,
    couponCode: `SAVE20-${config.key}`,
    couponDiscountPercent: 20,
    cashbackPercent: 5,
  };
}
