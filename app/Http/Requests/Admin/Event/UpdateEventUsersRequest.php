<?php

namespace App\Http\Requests\Admin\Event;

use App\Models\Event;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEventUsersRequest extends FormRequest
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
            'users' => ['nullable', 'array'],
            'users.*.id' => ['required', 'uuid', 'distinct', 'exists:users,id'],
            'users.*.access_role' => ['required', Rule::in([
                Event::AccessRoleResponsible,
                Event::AccessRoleAdmin,
                Event::AccessRoleStaff,
                Event::AccessRoleViewer,
            ])],
        ];
    }
}
