<?php

namespace App\Http\Requests\Admin\Tournament;

use App\Models\Referee;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertRefereeAccountRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $referee = $this->route('referee');
        $linkedUserId = $referee instanceof Referee ? $referee->user_id : null;

        if (! $linkedUserId && $referee instanceof Referee && $referee->email
            && mb_strtolower($referee->email) === mb_strtolower($this->string('email')->toString())) {
            $linkedUserId = User::query()
                ->where('email', $referee->email)
                ->whereHas('roles', fn ($query) => $query->where('name', 'Wasit'))
                ->value('id');
        }

        return [
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($linkedUserId)],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'email.required' => 'Email login wasit wajib diisi.',
            'email.email' => 'Format email login wasit belum valid.',
            'email.unique' => 'Email tersebut sudah digunakan oleh akun lain.',
            'password.required' => 'Password login wasit wajib diisi.',
            'password.min' => 'Password login wasit minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password belum sama.',
        ];
    }
}
