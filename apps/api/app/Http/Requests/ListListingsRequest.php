<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** The board's filters: country (always), category, search, and how many to load. */
class ListListingsRequest extends ApiRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'country' => ['required', 'string', Rule::in(array_keys(config('princess.countries')))],
            'category' => ['nullable', 'string', Rule::in(array_keys(config('princess.categories')))],
            'q' => ['nullable', 'string', 'max:'.config('princess.board.max_query')],
            'limit' => ['nullable', 'integer', 'min:1', 'max:'.config('princess.board.max_limit')],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        // a number out of range is not "too long"
        return ['limit.max' => 'invalid'] + parent::messages();
    }
}
