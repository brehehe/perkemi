<?php

namespace App\Http\Requests\Admin\Event;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveEventRundownRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'time' => ['nullable', 'string'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:time'],
            'name' => ['required', 'string', 'max:150'],
            'type' => ['required', 'string', 'max:100'],
            'is_match_session' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:500'],
            'order' => ['nullable', 'integer'],
        ];
    }
}
