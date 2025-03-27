import type { FlatNamespace, LanguageDetectorModule } from 'i18next';
import { createInstance } from 'i18next';
// import I18NextHttpBackend from 'i18next-http-backend';
// import { initReactI18next } from 'react-i18next';
import { getEnv } from './env.schema.ts';
import { i18nNamespacesSchema } from './index.ts';
import { useLocation } from 'react-router';
import { findRouteByPathname, ExtendedRouteConfigEntry, useRoutes } from './routing/routes-utils.tsx';
import { getLogger } from '@gc-fwcs/logger';
import { RouteConfigEntry } from '@react-router/dev/routes';

const log = getLogger('i18n/use-current-language');

/**
 * A constant array representing the supported application locales.
 * `as const` ensures that the array is treated as a tuple of literal types `'en'` and `'fr'`.
 */
export const APP_LOCALES = ['en', 'fr'] as const;

/**
 * Checks if a given value is a valid application locale.
 *
 * @param value - The value to check, which can be of any type.
 * @returns `true` if the value is a valid `AppLocale`, otherwise `false`.
 *
 * @example
 * ```
 * isAppLocale('en'); // true
 * isAppLocale('fr'); // true
 * isAppLocale('es'); // false
 * isAppLocale(123);  // false
 * ```
 */
export function isAppLocale(value: unknown): value is AppLocale {
  if (typeof value !== 'string') return false;
  return APP_LOCALES.includes(value as AppLocale);
}

/**
 * Returns the alternate language for the given input language.
 * (ie: 'en' → 'fr'; 'fr' → 'en')
 */
export function getAltLanguage(language: string): AppLocale {
  switch (language) {
    case 'en':
      return 'fr';
    case 'fr':
      return 'en';
    default:
      throw new Error(`Could not determine altLanguage for language: ${language}.`);
  }
}

/**
 * A hook that returns the current language and its alternate language.
 *
 * @returns An object containing the current language the alternate language.
 * @throws {Error} If no language can be detected for the current route.
 */
export function useCurrentLanguage(): AppLocale {
  const { pathname } = useLocation();
  const routes = useRoutes();
  return getLanguage(pathname, routes);
}

export function getLanguage(resource: Request | URL | string, routes: RouteConfigEntry[]): AppLocale {
  let pathname: string;
  switch (true) {
    case resource instanceof Request: {
      pathname = new URL(resource.url).pathname;
      break;
    }
    case resource instanceof URL: {
      pathname = (resource as URL).pathname;
      break;
    }
    default: {
      pathname = resource as string;
    }
  }

  const r = findRouteByPathname(routes, pathname);
  if(r) {
    const currentLanguage = (r as ExtendedRouteConfigEntry).lang;
    return currentLanguage;
  }
  // If no route matches the pathname, we can use the default language
  // from the URL. This is a fallback and should be handled more gracefully.
  log.warn(`No route found for pathname: ${pathname}. Falling back to default language.`);
  return { currentLanguage: 'en', altLanguage: 'fr' };
}

/**
 * Returns all namespaces required by the given routes by examining the route's i18nNamespaces handle property.
 * @see https://remix.run/docs/en/main/route/handle
 */
// export function getNamespaces(routes?: ({ handle?: unknown } | undefined)[]) {
//   if (routes === undefined) {
//     return [];
//   }

//   const namespaces = routes
//     .map((route) => route?.handle as RouteHandleData | undefined)
//     .map((handle) => i18nNamespacesSchema.safeParse(handle?.i18nNamespaces))
//     .flatMap((result) => (result.success ? result.data : undefined))
//     .filter((i18nNamespaces) => i18nNamespaces !== undefined);

//   return [...new Set(namespaces)];
// }

/**
 * Initializes the client instance of i18next.
 */
// export async function initI18n(namespaces: Array<string>) {
//   const { I18NEXT_DEBUG } = getEnv(process.env);
//   const i18n = createInstance();

//   const languageDetector = {
//     type: 'languageDetector',
//     detect: () => document.documentElement.lang,
//   } satisfies LanguageDetectorModule;

//   await i18n
//     .use(initReactI18next)
//     .use(languageDetector)
//     .use(I18NextHttpBackend)
//     .init({
//       appendNamespaceToMissingKey: true,
//       debug: I18NEXT_DEBUG,
//       defaultNS: false,
//       fallbackLng: false,
//       interpolation: {
//         escapeValue: false,
//       },
//       ns: namespaces,
//       preload: APP_LOCALES,
//       react: {
//         useSuspense: false,
//       },
//     });

//   return i18n;
// }

/**
 * Returns a tuple representing a typed list of namespaces.
 *
 * @template T - The primary namespace to include in the tuple.
 * @template T2 - Additional namespaces to include in the tuple. Should only contain distinct values.
 * @param ns - The primary namespace of type T.
 * @param rest - Additional namespaces of type T2 (should be distinct).
 * @returns A tuple containing the primary namespace and additional namespaces.
 *
 * @note Ensure that the values in the `rest` parameter are distinct to avoid duplicates in the resulting tuple.
 *
 * @example
 * // Usage example:
 * const result = getTypedI18nNs("common", "gcweb", "other");
 * // result is of type: readonly ["common", "gcweb", "other"]
 */
export function getTypedI18nNamespaces<const T extends Readonly<FlatNamespace>, const T2 extends ReadonlyArray<Exclude<FlatNamespace, T>>>(ns: T, ...rest: T2) {
  return [ns, ...rest] as const;
}

/**
 * Returns translation based off provided locale
 *
 * @returns either the english translation or the french translation.
 */
export function getNameByLanguage<T extends { nameEn: string; nameFr: string } | { nameEn?: string; nameFr?: string }>(language: string, obj: T): T extends { nameEn: infer N; nameFr: infer F } ? (typeof language extends 'fr' ? F : N) : never {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (language === 'fr' ? obj.nameFr : obj.nameEn) as any;
}

/**
 * Indiscriminately removes the language from a path.
 */
export function removeLanguageFromPath(path: string) {
  return path.replace(/^(\/en|\/fr)/, '');
}

/**
 * Determines the application locale based on the input string.
 *
 * @param locale - The locale string to evaluate.
 * @returns The application locale ('en' or 'fr').
 *
 * @example
 * // Returns 'en'
 * useAppLocale('en');
 *
 * @example
 * // Returns 'fr'
 * useAppLocale('fr');
 *
 * @example
 * // Returns 'en' for unsupported locale
 * useAppLocale('es');
 */
export function useAppLocale(locale: string): AppLocale {
  return locale === 'fr' ? 'fr' : 'en';
}
