<?php

namespace Tests\Unit;

use App\Enums\ListingStatus;
use App\Listings\ListingInput;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

// The shared case file, run against the API's validator. The web app runs the same file
// against its own (packages/shared/tests/listing-cases.test.ts), so the two cannot drift apart.
class ListingCasesTest extends TestCase
{
    /** @return array<string, mixed> */
    public static function caseFile(): array
    {
        return json_decode(file_get_contents(dirname(__DIR__, 4).'/packages/shared/cases/listing-validation.json'), true, flags: JSON_THROW_ON_ERROR);
    }

    /**
     * @param  array<string, mixed>  $case
     * @return array<string, mixed>
     */
    public static function inputOf(array $case): array
    {
        $input = array_replace(self::caseFile()['base'], $case['set']);
        foreach ($case['unset'] as $key) {
            unset($input[$key]);
        }

        return $input;
    }

    /** @return iterable<string, array{array<string, mixed>}> */
    public static function cases(): iterable
    {
        foreach (self::caseFile()['cases'] as $case) {
            yield $case['name'] => [$case];
        }
    }

    public function test_the_api_carries_the_rules_the_case_file_states(): void
    {
        $rules = self::caseFile()['rules'];
        $this->assertSame($rules['categories'], config('princess.categories'));
        $this->assertSame($rules['countries'], config('princess.countries'));
        $this->assertSame($rules['limits'], config('princess.limits'));
        $this->assertSame($rules['writable'], ListingInput::WRITABLE);
    }

    public function test_the_api_answers_with_exactly_the_moderation_codes_the_clients_word(): void
    {
        $rules = self::caseFile()['rules'];
        $this->assertSame($rules['moderation_reasons'], array_keys(config('princess.moderation.reasons')));
        $this->assertSame($rules['report_reasons'], array_keys(config('princess.moderation.report_reasons')));
        $this->assertSame($rules['statuses'], array_map(fn (ListingStatus $s) => $s->value, ListingStatus::cases()));
    }

    /** @param array<string, mixed> $case */
    #[DataProvider('cases')]
    public function test_case(array $case): void
    {
        $result = ListingInput::validate(self::inputOf($case));

        if ($case['ok']) {
            $this->assertTrue($result['ok'], 'expected it to pass, got '.json_encode($result['errors'] ?? null, JSON_UNESCAPED_UNICODE));
            foreach ($case['expect'] as $key => $value) {
                $this->assertSame($value, $result['value'][$key], $key);
            }
            $this->assertSame(self::caseFile()['rules']['writable'], array_keys($result['value']), 'nothing but the writable fields');
        } else {
            $this->assertFalse($result['ok'], 'expected it to be refused');
            $expected = $case['errors'];
            $actual = $result['errors'];
            ksort($expected);
            ksort($actual);
            $this->assertSame($expected, $actual);
        }
    }
}
