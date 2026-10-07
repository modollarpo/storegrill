'use client';

import { useState } from 'react';
import { citiesForCountry, postalRuleFor, type AddressField, type AddressIssueCode } from '@Storegrill/shared';
import { t } from '@/i18n';

export interface AddressFormValue {
  label: string;
  street: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const ADDRESS_LABELS = ['Home', 'Work', 'Other'];

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

function fieldError(
  locale: string,
  field: AddressField,
  code: AddressIssueCode | undefined,
  countryNameForZip: string
): string | null {
  if (!code) return null;
  switch (code) {
    case 'tooShort':
      return t(locale, `checkoutAddressError${field[0].toUpperCase()}${field.slice(1)}TooShort`);
    case 'badPostcode':
      return t(locale, 'checkoutAddressErrorBadPostcode', countryNameForZip);
    case 'postcodeRequired':
      return t(locale, 'checkoutAddressErrorPostcodeRequired', countryNameForZip);
    case 'stateRequired':
      return t(locale, 'checkoutAddressErrorStateRequired', countryNameForZip);
    case 'badCountry':
      return t(locale, 'checkoutAddressErrorBadCountry');
    default:
      return t(locale, 'checkoutAddressErrorRequired');
  }
}

export function CheckoutAddressFields({
  locale,
  value,
  countries,
  issues,
  onChange,
  idPrefix = 'addr',
}: {
  locale: string;
  value: AddressFormValue;
  countries: string[];
  issues: Partial<Record<AddressField, AddressIssueCode>>;
  onChange: (next: AddressFormValue) => void;
  idPrefix?: string;
}) {
  const set = (patch: Partial<AddressFormValue>) => onChange({ ...value, ...patch });
  const rule = postalRuleFor(value.country);
  const countryLabel = countryName(value.country);
  const stateRequired = rule.stateRequired;
  const zipRequired = Boolean(rule.pattern) && !rule.zipOptional;
  const cityOptions = citiesForCountry(value.country);
  const [customCity, setCustomCity] = useState(false);
  const cityKnown = value.city === '' || cityOptions.includes(value.city);
  const showCitySelect = cityOptions.length > 0 && !customCity && cityKnown;

  const errorFor = (field: AddressField) =>
    fieldError(locale, field, issues[field], countryLabel);
  const errId = (field: AddressField) => `${idPrefix}-${field}-error`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-1">
          <span className="block text-xs font-semibold mb-1.5 text-text-primary">
            {t(locale, 'checkoutAddressLabel')}
          </span>
          <select
            value={value.label || 'Home'}
            onChange={e => set({ label: e.target.value })}
            className="input"
          >
            {ADDRESS_LABELS.map(option => (
              <option key={option} value={option}>
                {t(locale, `checkoutAddressLabel${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-xs font-semibold mb-1.5 text-text-primary">
            {t(locale, 'checkoutAddressStreet')}
          </span>
          <input
            id={`${idPrefix}-street`}
            autoComplete="address-line1"
            value={value.street}
            onChange={e => set({ street: e.target.value })}
            placeholder={t(locale, 'checkoutAddressStreetPlaceholder')}
            aria-invalid={Boolean(issues.street)}
            aria-describedby={issues.street ? errId('street') : undefined}
            className="input"
          />
          {errorFor('street') && (
            <span id={errId('street')} role="alert" className="mt-1 block text-xs text-red-600">
              {errorFor('street')}
            </span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold mb-1.5 text-text-primary">
          {t(locale, 'checkoutAddressLine2')}
        </span>
        <input
          id={`${idPrefix}-line2`}
          autoComplete="address-line2"
          value={value.line2}
          onChange={e => set({ line2: e.target.value })}
          placeholder={t(locale, 'checkoutAddressLine2Placeholder')}
          className="input"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-2">
          <span className="block text-xs font-semibold mb-1.5 text-text-primary">
            {t(locale, 'checkoutAddressCity')}
          </span>
          {showCitySelect ? (
            <select
              id={`${idPrefix}-city`}
              autoComplete="address-level2"
              value={cityOptions.includes(value.city) ? value.city : ''}
              onChange={e => {
                if (e.target.value === '__other__') {
                  setCustomCity(true);
                  set({ city: '' });
                } else {
                  set({ city: e.target.value });
                }
              }}
              aria-invalid={Boolean(issues.city)}
              aria-describedby={issues.city ? errId('city') : undefined}
              className="input"
            >
              <option value="" disabled>
                {t(locale, 'checkoutAddressCitySelectPlaceholder')}
              </option>
              {cityOptions.map(city => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
              <option value="__other__">{t(locale, 'checkoutAddressCityOther')}</option>
            </select>
          ) : (
            <input
              id={`${idPrefix}-city`}
              autoComplete="address-level2"
              value={value.city}
              onChange={e => set({ city: e.target.value })}
              placeholder={t(locale, 'checkoutAddressCityPlaceholder')}
              aria-invalid={Boolean(issues.city)}
              aria-describedby={issues.city ? errId('city') : undefined}
              className="input"
            />
          )}
          {errorFor('city') && (
            <span id={errId('city')} role="alert" className="mt-1 block text-xs text-red-600">
              {errorFor('city')}
            </span>
          )}
        </label>

        <label className="block">
          <span className="block text-xs font-semibold mb-1.5 text-text-primary">
            {t(locale, 'checkoutAddressZip')}
            {zipRequired ? '' : ` (${t(locale, 'checkoutOptional')})`}
          </span>
          <input
            id={`${idPrefix}-zip`}
            autoComplete="postal-code"
            value={value.zip}
            onChange={e => set({ zip: e.target.value })}
            placeholder={t(locale, 'checkoutAddressZipPlaceholder')}
            aria-invalid={Boolean(issues.zip)}
            aria-describedby={issues.zip ? errId('zip') : undefined}
            className="input"
          />
          {errorFor('zip') && (
            <span id={errId('zip')} role="alert" className="mt-1 block text-xs text-red-600">
              {errorFor('zip')}
            </span>
          )}
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stateRequired && (
          <label className="block">
            <span className="block text-xs font-semibold mb-1.5 text-text-primary">
              {t(locale, 'checkoutAddressState')}
            </span>
            <input
              id={`${idPrefix}-state`}
              autoComplete="address-level1"
              value={value.state}
              onChange={e => set({ state: e.target.value })}
              placeholder={t(locale, 'checkoutAddressStatePlaceholder')}
              aria-invalid={Boolean(issues.state)}
              aria-describedby={issues.state ? errId('state') : undefined}
              className="input"
            />
            {errorFor('state') && (
              <span id={errId('state')} role="alert" className="mt-1 block text-xs text-red-600">
                {errorFor('state')}
              </span>
            )}
          </label>
        )}

        <label className="block">
          <span className="block text-xs font-semibold mb-1.5 text-text-primary">
            {t(locale, 'checkoutAddressCountry')}
          </span>
          <select
            id={`${idPrefix}-country`}
            autoComplete="country-name"
            value={value.country}
            onChange={e => {
              const nextCountry = e.target.value;
              setCustomCity(citiesForCountry(nextCountry).length === 0);
              set({
                country: nextCountry,
                state: postalRuleFor(nextCountry).stateRequired ? value.state : '',
                city: '',
              });
            }}
            aria-invalid={Boolean(issues.country)}
            aria-describedby={issues.country ? errId('country') : undefined}
            className="input"
          >
            {countries.map(code => (
              <option key={code} value={code}>
                {countryName(code)}
              </option>
            ))}
          </select>
          {errorFor('country') && (
            <span id={errId('country')} role="alert" className="mt-1 block text-xs text-red-600">
              {errorFor('country')}
            </span>
          )}
        </label>
      </div>
    </div>
  );
}
