<?php

namespace App\Listings;

use App\Support\JsText;

/**
 * The one check every new listing passes before it is saved: a port of validateListing in
 * packages/shared/src/listing.ts, rule for rule, so the form and the API refuse the same
 * things. packages/shared/cases/listing-validation.json runs the same cases through both.
 *
 * Validation is a filter: the value is built field by field from the rules below, so a key
 * without a rule (status, user_id, id...) is dropped, never passed through.
 */
final class ListingInput
{
    // D: "$" is the end of the text, as in JavaScript (without it PHP also accepts a final "\n")
    public const PHONE_PATTERN = '/^\+[1-9][0-9]{6,14}$/D';

    public const INSTAGRAM_PATTERN = '/^[A-Za-z0-9._]{1,30}$/D';

    /**
     * An email address in the name, the title or the description: refused ("has_email"), not just
     * sent to review — a contact address in free text is a way around the contact fields and the
     * review. Phone numbers and @handles in the text stay a review signal (Signals). The same
     * pattern as @princess/shared listing.ts EMAIL_IN_TEXT; the shared case file holds the two together.
     */
    public const EMAIL_IN_TEXT = '/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/';

    /** A photo id from POST /photos: a UUID in lower case, as the API writes them. */
    public const PHOTO_ID_PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/D';

    /**
     * The fields she writes. Everything else on a listing is the API's to set. "photo" is the id
     * of her upload; whether she may use it is checked when the listing claims it.
     */
    public const WRITABLE = [
        'name', 'title', 'category', 'country', 'city', 'district', 'description',
        'price', 'photo', 'whatsapp', 'phone', 'social',
    ];

    /** @var array<string, string> field => error code */
    private array $errors = [];

    /** @param array<mixed> $input */
    private function __construct(private readonly array $input) {}

    /**
     * @param  array<mixed>  $input  the decoded JSON body
     * @return array{ok: true, value: array<string, string|null>}|array{ok: false, errors: array<string, string>}
     */
    public static function validate(array $input): array
    {
        return (new self($input))->run();
    }

    /** "٠١٠ ١٢٣-٤٥٦٧" → "0101234567"; "00966…" → "+966…". Does not guess a country code. */
    public static function normalizePhone(string $raw): string
    {
        $latin = preg_replace_callback('/[\x{0660}-\x{0669}\x{06F0}-\x{06F9}]/u', fn (array $d) => (string) (mb_ord($d[0]) & 0xF), $raw);
        $compact = preg_replace('/['.JsText::SPACE.'().-]/u', '', $latin);

        return str_starts_with($compact, '00') ? '+'.substr($compact, 2) : $compact;
    }

    /** "@Princess.Nails" → "Princess.Nails". */
    public static function normalizeInstagram(string $raw): string
    {
        return preg_replace('/^@/', '', JsText::trim($raw));
    }

    /** The full E.164 pattern a number must match in this country: dialling code, length, first digit. */
    public static function countryPhonePattern(string $country): string
    {
        $rule = config("princess.countries.$country");

        return '/^'.preg_quote($rule['dial'], '/').$rule['lead'].'[0-9]{'.($rule['length'] - 1).'}$/D';
    }

    private function run(): array
    {
        $limits = config('princess.limits');

        $name = $this->requiredText('name', $limits['name']);
        $title = $this->requiredText('title', $limits['title']);
        $description = $this->requiredText('description', $limits['description']);
        $city = $this->requiredText('city');
        $district = $this->optionalText('district');
        $price = $this->optionalText('price', $limits['price']);

        $category = $this->input['category'] ?? null;
        if ($category === null || $category === '') {
            $this->errors['category'] = 'required';
        } elseif (! is_string($category) || ! array_key_exists($category, config('princess.categories'))) {
            $this->errors['category'] = 'invalid';
        }

        $country = $this->input['country'] ?? null;
        $countryKnown = is_string($country) && array_key_exists($country, config('princess.countries'));
        if ($country === null || $country === '') {
            $this->errors['country'] = 'required';
        } elseif (! $countryKnown) {
            $this->errors['country'] = 'invalid';
        }

        $photo = $this->optionalPattern('photo', self::PHOTO_ID_PATTERN, fn (string $s) => $s);
        $whatsapp = $this->optionalPattern('whatsapp', self::PHONE_PATTERN, self::normalizePhone(...));
        $phone = $this->optionalPattern('phone', self::PHONE_PATTERN, self::normalizePhone(...));
        $social = $this->optionalPattern('social', self::INSTAGRAM_PATTERN, self::normalizeInstagram(...));

        // A number must belong to the listing's country: its dialling code, length and first digit.
        if ($countryKnown) {
            $local = self::countryPhonePattern($country);
            if ($whatsapp !== null && ! preg_match($local, $whatsapp)) {
                $this->errors['whatsapp'] = 'invalid';
            }
            if ($phone !== null && ! preg_match($local, $phone)) {
                $this->errors['phone'] = 'invalid';
            }
        }

        // At least one contact method. A malformed one already has its own error and does not count.
        $anyContactGiven = false;
        foreach (['whatsapp', 'phone', 'social'] as $key) {
            $anyContactGiven = $anyContactGiven || $this->read($key)['kind'] !== 'missing';
        }
        if (! $anyContactGiven) {
            $this->errors['contact'] = 'contact_required';
        }

        if ($this->errors !== []) {
            return ['ok' => false, 'errors' => $this->errors];
        }

        return ['ok' => true, 'value' => compact(
            'name', 'title', 'category', 'country', 'city', 'district', 'description', 'price', 'photo', 'whatsapp', 'phone', 'social',
        )];
    }

    /** @return array{kind: 'missing'|'wrong_type'|'value', value?: string} */
    private function read(string $key): array
    {
        $v = $this->input[$key] ?? null;
        if ($v === null) {
            return ['kind' => 'missing'];
        }
        if (! is_string($v)) {
            return ['kind' => 'wrong_type'];
        }
        $t = JsText::trim($v);

        return $t === '' ? ['kind' => 'missing'] : ['kind' => 'value', 'value' => $t];
    }

    private function requiredText(string $key, ?int $max = null): string
    {
        $t = $this->read($key);
        if ($t['kind'] === 'missing') {
            $this->errors[$key] = 'required';

            return '';
        }
        if ($t['kind'] === 'wrong_type') {
            $this->errors[$key] = 'invalid';

            return '';
        }
        if ($max !== null && JsText::length($t['value']) > $max) {
            $this->errors[$key] = 'too_long';

            return '';
        }
        if ($key !== 'city' && preg_match(self::EMAIL_IN_TEXT, $t['value']) === 1) {
            $this->errors[$key] = 'has_email';

            return '';
        }

        return $t['value'];
    }

    private function optionalText(string $key, ?int $max = null): ?string
    {
        $t = $this->read($key);
        if ($t['kind'] === 'missing') {
            return null;
        }
        if ($t['kind'] === 'wrong_type') {
            $this->errors[$key] = 'invalid';

            return null;
        }
        if ($max !== null && JsText::length($t['value']) > $max) {
            $this->errors[$key] = 'too_long';

            return null;
        }

        return $t['value'];
    }

    /** @param callable(string): string $normalize */
    private function optionalPattern(string $key, string $pattern, callable $normalize): ?string
    {
        $t = $this->read($key);
        if ($t['kind'] === 'missing') {
            return null;
        }
        if ($t['kind'] === 'wrong_type') {
            $this->errors[$key] = 'invalid';

            return null;
        }
        $v = $normalize($t['value']);
        if (! preg_match($pattern, $v)) {
            $this->errors[$key] = 'invalid';

            return null;
        }

        return $v;
    }
}
