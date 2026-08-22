# Internationalization (i18n) in JavaScript

Interviewers use i18n to check whether you've shipped a product to more than one market — the difference between "translate a few strings" and knowing why `amount.toFixed(2) + " €"` breaks the first time the product launches in Japan or Germany. Every example below is a piece of Northwind, a fictional e-commerce/SaaS checkout and billing product, not a toy `Hello`/`Bonjour` string.

## 1. Globalization vs. Internationalization vs. Localization

The three terms get used loosely, but they mean different things and interviewers notice when you conflate them:

* **Internationalization (i18n** — 18 is the letter count between the "i" and the "n**)**: the engineering work of designing the codebase so it *can* support any locale without structural rewrites — externalizing strings, using `Intl` instead of hand-rolled formatting, avoiding hardcoded layout directions.
* **Localization (l10n** — 10 letters between "l" and "n**)**: the content work of adapting that framework for one *specific* market — translating copy, supplying regional date/currency formats, adjusting imagery.
* **Globalization (g11n)**: the combination of both — i18n done once, l10n repeated per market.

If Northwind's checkout page is built with i18n from day one, launching only in `en-US` initially, then adding `es-MX` six months later is pure localization work (new translation files, no code changes). Skipping i18n means every new market is a code change.

## 2. Locale Identifiers (BCP 47)

A **locale** is a standardized string that encodes language and region together, in `[language]-[REGION]` form. It drives every formatting decision downstream — dates, currency, plural rules, sort order.

* `en-US` — English, United States: `MM/DD/YYYY` dates, `$` currency, period as decimal separator.
* `en-GB` — English, Great Britain: `DD/MM/YYYY` dates, `£` currency.
* `de-DE` — German, Germany: `DD.MM.YYYY` dates, `.` as the thousands separator and `,` as the decimal separator (the reverse of `en-US`).
* `zh-CN` — Simplified Chinese, mainland China.

Northwind never hardcodes "assume US formatting" — every formatting call below takes the user's locale (from their account settings, browser `navigator.language`, or an `Accept-Language` header) as an explicit parameter.

## 3. Externalizing UI Strings into Translation Catalogs

The first i18n rule: no UI string is ever hardcoded in a component. Every piece of user-facing text lives in a locale-specific JSON catalog, keyed by an identifier the code references instead of the literal text.

```json
// locales/en.json
{
  "checkout": {
    "welcome": "Welcome back, {{name}}!",
    "cart_count": "{count, plural, =0 {Your cart is empty} one {You have 1 item} other {You have # items}}"
  }
}

// locales/es.json
{
  "checkout": {
    "welcome": "¡Bienvenido de nuevo, {{name}}!",
    "cart_count": "{count, plural, =0 {Tu carrito está vacío} one {Tienes 1 artículo} other {Tienes # artículos}}"
  }
}
```

The `cart_count` key already shows why this has to be data, not code: English only needs a singular/plural split, but other languages need more categories (see Section 6). Baking `count === 1 ? "item" : "items"` into a component makes that impossible to fix later without another deploy.

## 4. Wiring Translations into React with `react-i18next`

```bash
npm install react-i18next i18next
```

```javascript
// i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes output
});

export default i18n;
```

```jsx
// CheckoutHeader.jsx
import { useTranslation } from "react-i18next";

export function CheckoutHeader({ user, cartItemCount }) {
  const { t, i18n } = useTranslation();

  return (
    <header className="checkout-header">
      <h1>{t("checkout.welcome", { name: user.firstName })}</h1>
      <p>{t("checkout.cart_count", { count: cartItemCount })}</p>

      <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </header>
  );
}
```

`t()` resolves the key against the active language's catalog; `i18n.changeLanguage()` swaps the whole catalog at runtime without a page reload. `CheckoutHeader` never branches on language — the component is identical for every locale Northwind ships.

## 5. Pluralization Rules

A naive `count === 1 ? singular : plural` check is an English-only assumption. CLDR (the Unicode locale data behind `Intl` and i18next) defines up to six plural categories per language — English has two (`one`, `other`), Russian has four, Arabic has six. Northwind's "items left in stock" and cart-count messages have to route through the ICU plural syntax shown in Section 3, or through i18next's `_plural` key convention:

```json
{
  "stock_warning": "Only {{count}} left in stock",
  "stock_warning_plural": "Only {{count}} left in stock"
}
```

```jsx
<p>{t("stock_warning", { count: remainingStock })}</p>
```

i18next picks the right key for the active locale's plural category automatically — the component just passes `count` and never re-implements plural logic per language.

## 6. Date and Time Formatting with `Intl.DateTimeFormat`

Never build a date string with manual concatenation (`day + "/" + month + "/" + year`) — it silently assumes one region's convention. Northwind's subscription-renewal date on the billing page is formatted through the native `Intl` API instead:

```javascript
const renewalDate = new Date("2026-10-25T14:30:00");

// US: month first
new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(renewalDate);
// "Sunday, October 25, 2026"

// Germany: day first, different month/weekday names
new Intl.DateTimeFormat("de-DE", { dateStyle: "full" }).format(renewalDate);
// "Sonntag, 25. Oktober 2026"
```

`Intl.DateTimeFormat` also handles time zones (`timeZone: "Asia/Kolkata"`) and relative phrasing via the related `Intl.RelativeTimeFormat` (`"in 3 days"` / `"dans 3 jours"`), both of which a manually built date string can't do correctly at all.

## 7. Number and Currency Formatting with `Intl.NumberFormat`

Currency formatting has three moving parts that vary by locale: the decimal separator, the thousands separator, and the symbol's placement (and even whether the currency has fractional units at all). Northwind's invoice total is a single `Intl.NumberFormat` call, never a hand-rolled `.toFixed(2)`:

```javascript
const invoiceTotal = 1250500.75;

new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(invoiceTotal);
// "$1,250,500.75"

new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(invoiceTotal);
// "1.250.500,75 €"  — dots and commas are flipped from en-US

new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(invoiceTotal);
// "￥1,250,501"  — yen has no minor (cents) unit, so it's rounded
```

The `de-DE` output is exactly why `amount + ".00 €"` string concatenation breaks: the separators are inverted, not just the symbol's position.

## 8. RTL and LTR Layout Support

Arabic (`ar`) and Hebrew (`he`) read right-to-left, and a fully internationalized layout has to mirror — sidebar, button order, and text alignment all flip. CSS properties written in physical terms (`margin-left`, `text-align: left`) stay frozen in LTR no matter what `dir` is set to; **CSS logical properties** resolve relative to the reading direction instead:

```css
/* Breaks when Northwind's checkout switches to an RTL locale */
.submit-btn {
  margin-left: 20px;
  text-align: left;
  border-right: 2px solid black;
}

/* Adapts automatically: "start" is left in LTR, right in RTL */
.submit-btn {
  margin-inline-start: 20px;
  text-align: start;
  border-inline-end: 2px solid black;
}
```

```javascript
// Flip the whole document's reading direction when the user picks an RTL locale
document.documentElement.setAttribute("dir", rtlLocales.includes(locale) ? "rtl" : "ltr");
```

Setting `dir="rtl"` on `<html>` combined with logical properties throughout the stylesheet means Northwind's checkout mirrors correctly without a second, RTL-specific stylesheet.

## 9. Testing i18n

Because the failure mode is "looks fine in `en-US`, silently wrong everywhere else," i18n needs deliberate test coverage rather than incidental catching:

* Switch the browser or OS locale and re-check date, currency, and pluralization output on the same page.
* Force an RTL locale (`ar`, `he`) and check layout mirroring, not just text direction.
* Run pseudo-localization (translations padded with extra characters) to catch UI that breaks when strings get longer than English.
* Automate catalog-completeness checks (a CI step that fails if `es.json` is missing a key `en.json` has) alongside functional tests with Jest + i18next.

## 10. Common Anti-Patterns vs. the Native Solution

| Engineering problem | The anti-pattern | The scalable fix |
|---|---|---|
| Static UI text | Hardcoded strings in components | Keyed JSON translation catalogs, loaded per locale |
| Pluralization | `count === 1 ? "item" : "items"` | ICU plural syntax / i18next `_plural` keys |
| Numbers and currency | `amount.toFixed(2) + " €"` | `Intl.NumberFormat` with the user's locale |
| Dates | Manual `day + "/" + month + "/" + year` concatenation | `Intl.DateTimeFormat` with the user's locale |
| RTL layout | `margin-left`, `text-align: left` | CSS logical properties + `dir="rtl"` on `<html>` |

## Interview Questions and Answers

### 1. What's the difference between i18n, l10n, and g11n?
**Answer:** i18n (internationalization) is the engineering work of preparing an app's codebase so it can support any locale without structural rewrites — externalized strings, `Intl`-based formatting, direction-agnostic CSS. l10n (localization) is the content work of adapting that framework for one specific market — translating text, supplying regional formats. g11n (globalization) is the combination: i18n done once, l10n repeated per target market.

### 2. Why is `amount.toFixed(2) + " €"` the wrong way to format currency?
**Answer:** It bakes in one locale's conventions — a period as the decimal separator, the symbol appended at the end — and breaks for any other locale. German formatting (`1.250.500,75 €`) flips the decimal and thousands separators entirely, and Japanese yen has no fractional (cents) unit at all. `Intl.NumberFormat(locale, { style: "currency", currency })` handles all of this correctly for any locale without custom logic.

### 3. Why can't pluralization be handled with a simple `count === 1 ? singular : plural` check?
**Answer:** That check assumes English's plural rules, which only have two categories (`one`, `other`). Other languages have more: Russian has four plural categories, Arabic has six. A hardcoded ternary can't represent that, so real i18n systems use CLDR-based plural rules — ICU MessageFormat syntax or i18next's `_plural` key convention — so the correct category is selected per locale automatically.

### 4. What does a locale identifier like `de-DE` actually encode, and why does it matter?
**Answer:** It follows the BCP 47 format `[language]-[REGION]` — `de-DE` is German as spoken in Germany. It matters because language alone isn't enough to determine formatting: it drives which date format, currency, decimal separator, and plural rules apply. The same language can format differently by region (e.g., `en-US` vs. `en-GB` dates), so the full locale, not just the language code, has to be passed to every `Intl` call.

### 5. Why are CSS logical properties necessary for RTL support, and what's wrong with `margin-left`/`text-align: left`?
**Answer:** Physical properties like `margin-left` are anchored to the screen's left/right axis regardless of reading direction, so they stay frozen in an LTR layout even when `dir="rtl"` is set on the page. Logical properties like `margin-inline-start` and `text-align: start` resolve relative to the document's reading direction — `start` means left in LTR and right in RTL automatically — so the same stylesheet mirrors correctly for both directions with no separate RTL stylesheet.

### 6. In `react-i18next`, what does `i18n.changeLanguage()` do, and does it require a page reload?
**Answer:** It swaps the active translation catalog at runtime and re-renders any component using `useTranslation()`'s `t()` function with the new language's strings. No reload is needed — React re-renders the affected components with the new locale's text as soon as the language changes, which is why the checkout header's language `<select>` can update the whole page instantly.

### 7. Why should `interpolation.escapeValue` be set to `false` when configuring i18next for a React app?
**Answer:** i18next's interpolation defaults to escaping values (originally meant to prevent XSS when injecting translated strings into raw HTML). React already escapes all rendered text by default, so double-escaping would corrupt characters like accented letters or ampersands in translated strings. Setting `escapeValue: false` avoids that double-escaping since React's own rendering already provides the XSS protection.

### 8. What's the actual difference between externalizing strings into a translation catalog versus just hardcoding text and later find/replacing it?
**Answer:** A translation catalog decouples text from code entirely — a component references a key (`checkout.welcome`), and the catalog for the active locale supplies the string, including locale-specific pluralization and interpolation. Find/replacing hardcoded text means every new locale requires touching and redeploying the component code, and it can't express the fact that a single English string may need multiple grammatically different translations (plural forms, gendered forms) that a single find/replace can't represent.

### 9. How would you test that Northwind's checkout page is genuinely internationalized, not just translated?
**Answer:** Beyond checking translated text renders, verify the behaviors that translation alone doesn't cover: force an RTL locale and confirm the layout mirrors (not just that Arabic text displays), check that dates and currency reformat correctly across at least two different locales, run pseudo-localization to catch UI that breaks when strings are longer than English, and add a CI check that fails if any locale's catalog is missing a key present in the base (`en`) catalog.

## Revision Checklist

- [ ] Explain i18n vs. l10n vs. g11n precisely, and give a real example of each using one product.
- [ ] Explain why a locale identifier (`en-US`, `de-DE`) needs both language and region, not just language.
- [ ] Format a date and a currency value with `Intl.DateTimeFormat` and `Intl.NumberFormat` for at least two different locales from memory.
- [ ] Explain why naive pluralization (`count === 1 ? ... : ...`) breaks for languages other than English, and name the alternative (ICU plural syntax / CLDR categories).
- [ ] Wire up `react-i18next`: catalog JSON, `i18n.init()`, `useTranslation()`, and a language switcher that calls `changeLanguage()`.
- [ ] Explain why CSS logical properties (`margin-inline-start`, `text-align: start`) are required for RTL support instead of physical properties.
- [ ] List at least three things to test for i18n beyond "the translated text shows up" (RTL layout, pseudo-localization, catalog completeness).
