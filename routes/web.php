<?php

use App\Http\Controllers\Admin\Arbitration\ArbitrationController;
use App\Http\Controllers\Admin\Arbitration\ArbitrationEvaluationController;
use App\Http\Controllers\Admin\Arbitration\ArbitrationScorePrintController;
use App\Http\Controllers\Admin\Arbitration\EmbuJudgeScoreController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DocumentationController;
use App\Http\Controllers\Admin\Master\AthleteController;
use App\Http\Controllers\Admin\Master\ClerkController;
use App\Http\Controllers\Admin\Master\ContingentController;
use App\Http\Controllers\Admin\Master\EventController;
use App\Http\Controllers\Admin\Master\EventDetailController;
use App\Http\Controllers\Admin\Master\EventRefereeImportController;
use App\Http\Controllers\Admin\Master\FieldCoordinatorController;
use App\Http\Controllers\Admin\Master\KyuController;
use App\Http\Controllers\Admin\Master\MasterDataTransferController;
use App\Http\Controllers\Admin\Master\OfficialController;
use App\Http\Controllers\Admin\Master\PaymentMethodController;
use App\Http\Controllers\Admin\Master\RefereeController;
use App\Http\Controllers\Admin\Master\TechniqueController;
use App\Http\Controllers\Admin\Master\UserController;
use App\Http\Controllers\Admin\Master\WeightClassController;
use App\Http\Controllers\Admin\Panitera\ChampionResultController;
use App\Http\Controllers\Admin\Panitera\EmbuPenaltyController;
use App\Http\Controllers\Admin\Panitera\EmbuResultController;
use App\Http\Controllers\Admin\Panitera\PaniteraCourtMonitorController;
use App\Http\Controllers\Admin\Panitera\PaniteraDashboardController;
use App\Http\Controllers\Admin\Panitera\PaniteraEventContextController;
use App\Http\Controllers\Admin\Panitera\PaniteraMatchController;
use App\Http\Controllers\Admin\Panitera\PaniteraMatchWorkflowController;
use App\Http\Controllers\Admin\Panitera\PaniteraTimerController;
use App\Http\Controllers\Admin\Panitera\RandoriResultController;
use App\Http\Controllers\Admin\Panitera\VarReviewController;
use App\Http\Controllers\Admin\Panitera\VerifiedEmbuResultController;
use App\Http\Controllers\Admin\Registration\RegistrationController;
use App\Http\Controllers\Admin\Registration\RegistrationWizardController;
use App\Http\Controllers\Admin\Report\ReportController;
use App\Http\Controllers\Admin\Simulation\TrainingModeController;
use App\Http\Controllers\Admin\Tournament\EventRefereeController;
use App\Http\Controllers\Admin\Tournament\TournamentController;
use App\Http\Controllers\Admin\Tournament\WeighInController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\NikLoginController;
use App\Http\Controllers\Auth\PaniteraTokenLoginController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Contingent\AthleteController as ContingentAthleteController;
use App\Http\Controllers\Contingent\OfficialController as ContingentOfficialController;
use App\Http\Controllers\Contingent\PortalController as ContingentPortalController;
use App\Http\Controllers\PublicAthleteController;
use App\Http\Controllers\PublicCourtMonitorController;
use App\Http\Controllers\PublicEventController;
use App\Http\Controllers\Referee\RefereeAttendanceHistoryController;
use App\Http\Controllers\Referee\RefereeCheckInController;
use App\Http\Controllers\Referee\RefereePortalController;
use App\Http\Controllers\Referee\RefereeScoreHistoryController;
use App\Http\Controllers\TenantAccessController;
use App\Http\Controllers\WelcomeController;
use App\Mail\ContingentAccountCreatedMail;
use App\Models\Contingent;
use App\Models\User;
use Illuminate\Support\Facades\Route;

Route::get('/', [WelcomeController::class, 'index'])->name('home');
Route::get('/athelete', [PublicAthleteController::class, 'index'])->name('athletes.index');
Route::get('/athelete/{athlete}', [PublicAthleteController::class, 'show'])->name('athletes.show');
Route::get('/athelete/{athlete}/photo', [PublicAthleteController::class, 'photo'])->name('athletes.photo');
Route::redirect('/athlete', '/athelete');

// Public Event Access (Slug-based)
Route::get('/event/{slug}', [PublicEventController::class, 'show'])->name('event.public.show');
Route::get('/event/{slug}/register', [PublicEventController::class, 'register'])->name('event.public.register');
Route::post('/event/{slug}/register', [PublicEventController::class, 'storeRegistration'])->name('event.public.register.store');
Route::get('/event/{slug}/court/{eventCourt}/monitor', [PublicCourtMonitorController::class, 'show'])->name('event.public.court.monitor');
Route::get('/event/{slug}/court/{eventCourt}/monitor/state', [PublicCourtMonitorController::class, 'state'])->name('event.public.court.monitor.state');
Route::get('/event/{slug}/court/{eventCourt}/monitor/timer', [PublicCourtMonitorController::class, 'timer'])->name('event.public.court.monitor.timer');

// Tenant Admin Entry & Exit (Slug-based)
Route::get('/event/{slug}/admin', [TenantAccessController::class, 'enter'])->name('event.tenant.enter');
Route::post('/admin/tenant/exit', [TenantAccessController::class, 'exit'])->name('admin.tenant.exit');

Route::prefix('kontingen')->middleware(['auth', 'contingent'])->name('kontingen.')->group(function () {
    Route::redirect('/', '/kontingen/registrasi')->name('index');
    Route::get('registrasi', [ContingentPortalController::class, 'registration'])->name('registrasi');
    Route::get('registrasi/event/{event}/mulai', [ContingentPortalController::class, 'startRegistration'])->name('registrasi.start');
    Route::get('registrasi/{registration}', [ContingentPortalController::class, 'openRegistration'])->name('registrasi.detail');
    Route::get('jadwal', [ContingentPortalController::class, 'schedule'])->name('jadwal');
    Route::get('hasil', [ContingentPortalController::class, 'results'])->name('hasil');
    Route::get('hasil/juara', [ContingentPortalController::class, 'results'])->name('hasil.juara');
    Route::get('hasil/embu', [ContingentPortalController::class, 'embuResults'])->name('hasil.embu');
    Route::get('hasil/embu/{embuScore}/cetak', [ContingentPortalController::class, 'printEmbuResult'])->name('hasil.embu.print');
    Route::get('hasil/randori', [ContingentPortalController::class, 'randoriResults'])->name('hasil.randori');
    Route::get('atlet', [ContingentPortalController::class, 'athletes'])->name('atlet');
    Route::post('atlet', [ContingentAthleteController::class, 'store'])->name('atlet.store');
    Route::put('atlet/{athlete}', [ContingentAthleteController::class, 'update'])->name('atlet.update');
    Route::delete('atlet/{athlete}', [ContingentAthleteController::class, 'destroy'])->name('atlet.destroy');
    Route::get('atlet/{athlete}/photo', [ContingentAthleteController::class, 'photo'])->name('atlet.photo');
    Route::get('official', [ContingentPortalController::class, 'officials'])->name('official');
    Route::post('official', [ContingentOfficialController::class, 'store'])->name('official.store');
    Route::put('official/{official}', [ContingentOfficialController::class, 'update'])->name('official.update');
    Route::delete('official/{official}', [ContingentOfficialController::class, 'destroy'])->name('official.destroy');
    Route::get('riwayat-pendaftaran', [ContingentPortalController::class, 'history'])->name('riwayat-pendaftaran');
});

Route::redirect('/admin', '/admin/dashboard');
Route::get('/admin/dashboard', [DashboardController::class, 'index'])->middleware('auth')->name('admin.dashboard');
Route::get('/admin/checklist-uji', [DocumentationController::class, 'checklist'])->middleware('auth')->name('admin.checklist');
Route::get('/admin/checklist-uji/download', [DocumentationController::class, 'download'])->middleware('auth')->name('admin.checklist.download');

Route::prefix('admin/master')->middleware(['auth', 'event.tenant'])->name('admin.master.')->group(function () {
    Route::get('data-transfer/{type}/template', [MasterDataTransferController::class, 'template'])->name('data-transfer.template');
    Route::get('data-transfer/{type}/export', [MasterDataTransferController::class, 'export'])->name('data-transfer.export');
    Route::post('data-transfer/{type}/import', [MasterDataTransferController::class, 'import'])->name('data-transfer.import');

    // Event Management
    Route::get('event', [EventController::class, 'index'])->name('event.index');
    Route::put('event/homepage-settings', [EventController::class, 'updateHomepageSettings'])->name('event.homepage-settings.update');
    Route::post('event', [EventController::class, 'store'])->name('event.store');
    Route::put('event/{event}', [EventController::class, 'update'])->name('event.update');
    Route::delete('event/{event}', [EventController::class, 'destroy'])->name('event.destroy');
    Route::post('event/{event}/activate', [EventController::class, 'activate'])->name('event.activate');

    // Event Detail & Configuration
    Route::get('event/detail', [EventDetailController::class, 'show'])->name('event.detail.default');
    Route::get('event/{event}/detail', [EventDetailController::class, 'show'])->name('event.detail');
    Route::put('event/{event}/general', [EventDetailController::class, 'updateGeneral'])->name('event.update.general');
    Route::post('event/{event}/cover', [EventDetailController::class, 'updateCover'])->name('event.cover.update');
    Route::delete('event/{event}/cover', [EventDetailController::class, 'destroyCover'])->name('event.cover.destroy');
    Route::put('event/{event}/users', [EventDetailController::class, 'updateEventUsers'])->name('event.users.update');
    Route::put('event/{event}/dates', [EventDetailController::class, 'updateDates'])->name('event.update.dates');
    Route::put('event/{event}/fees', [EventDetailController::class, 'updateFees'])->name('event.update.fees');
    Route::put('event/{event}/tournament-settings', [EventDetailController::class, 'updateTournamentSettings'])->name('event.update.tournament-settings');
    Route::put('event/{event}/participant-rules', [EventDetailController::class, 'updateParticipantRules'])->name('event.update.participant-rules');

    // Event Age Categories (Kelompok Umur & Tarif)
    Route::post('event/{event}/age-category', [EventDetailController::class, 'storeAgeCategory'])->name('event.age-category.store');
    Route::put('event/{event}/age-category/{ageCategory}', [EventDetailController::class, 'updateAgeCategory'])->name('event.age-category.update');
    Route::delete('event/{event}/age-category/{ageCategory}', [EventDetailController::class, 'destroyAgeCategory'])->name('event.age-category.destroy');

    // Event Courts (Lapangan / Tatami)
    Route::post('event/{event}/court', [EventDetailController::class, 'storeCourt'])->name('event.court.store');
    Route::put('event/{event}/court/{court}', [EventDetailController::class, 'updateCourt'])->name('event.court.update');
    Route::post('event/{event}/court/{court}/regenerate-token', [EventDetailController::class, 'regenerateCourtToken'])->name('event.court.regenerate-token');
    Route::delete('event/{event}/court/{court}', [EventDetailController::class, 'destroyCourt'])->name('event.court.destroy');

    // Event Match Categories (Nomer Pertandingan)
    Route::post('event/{event}/match-category', [EventDetailController::class, 'storeMatchCategory'])->name('event.match-category.store');
    Route::put('event/{event}/match-category/{matchCategory}', [EventDetailController::class, 'updateMatchCategory'])->name('event.match-category.update');
    Route::patch('event/{event}/match-category/{matchCategory}/toggle-exhibition', [EventDetailController::class, 'toggleMatchCategoryExhibition'])->name('event.match-category.toggle-exhibition');
    Route::delete('event/{event}/match-category/{matchCategory}', [EventDetailController::class, 'destroyMatchCategory'])->name('event.match-category.destroy');

    // Event Referees
    Route::get('event/{event}/referee-import/template', [EventRefereeImportController::class, 'template'])->name('event.referee-import.template');
    Route::post('event/{event}/referee-import', [EventRefereeImportController::class, 'store'])->name('event.referee-import.store');
    Route::post('event/{event}/referee', [EventDetailController::class, 'storeEventReferee'])->name('event.referee.store');
    Route::delete('event/{event}/referee/{referee}', [EventDetailController::class, 'destroyEventReferee'])->name('event.referee.destroy');

    Route::post('event/{event}/clerk', [EventDetailController::class, 'storeEventClerk'])->name('event.clerk.store');
    Route::delete('event/{event}/clerk/{clerk}', [EventDetailController::class, 'destroyEventClerk'])->name('event.clerk.destroy');
    Route::post('event/{event}/field-coordinator', [EventDetailController::class, 'storeEventFieldCoordinator'])->name('event.field-coordinator.store');
    Route::delete('event/{event}/field-coordinator/{fieldCoordinator}', [EventDetailController::class, 'destroyEventFieldCoordinator'])->name('event.field-coordinator.destroy');

    // Event Rundowns (Sesi Acara & Rundown)
    Route::post('event/{event}/rundown', [EventDetailController::class, 'storeRundown'])->name('event.rundown.store');
    Route::put('event/{event}/rundown/{rundown}', [EventDetailController::class, 'updateRundown'])->name('event.rundown.update');
    Route::delete('event/{event}/rundown/{rundown}', [EventDetailController::class, 'destroyRundown'])->name('event.rundown.destroy');

    // Contingent Management
    Route::get('contingent', [ContingentController::class, 'index'])->name('contingent.index');
    Route::post('contingent', [ContingentController::class, 'store'])->name('contingent.store');
    Route::put('contingent/{contingent}', [ContingentController::class, 'update'])->name('contingent.update');
    Route::delete('contingent/{contingent}', [ContingentController::class, 'destroy'])->name('contingent.destroy');
    Route::post('contingent/{contingent}/verify', [ContingentController::class, 'verify'])->name('contingent.verify');

    // Athlete Management
    Route::get('athlete', [AthleteController::class, 'index'])->name('athlete.index');
    Route::post('athlete', [AthleteController::class, 'store'])->name('athlete.store');
    Route::get('athlete/{athlete}/detail', [AthleteController::class, 'detail'])->name('athlete.detail');
    Route::get('athlete/{athlete}/photo', [AthleteController::class, 'photo'])->name('athlete.photo');
    Route::post('athlete/{athlete}/photo', [AthleteController::class, 'updatePhoto'])->name('athlete.photo.update');
    Route::put('athlete/{athlete}', [AthleteController::class, 'update'])->name('athlete.update');
    Route::delete('athlete/{athlete}', [AthleteController::class, 'destroy'])->name('athlete.destroy');

    // Official Management
    Route::get('official', [OfficialController::class, 'index'])->name('official.index');
    Route::post('official', [OfficialController::class, 'store'])->name('official.store');
    Route::put('official/{official}', [OfficialController::class, 'update'])->name('official.update');
    Route::delete('official/{official}', [OfficialController::class, 'destroy'])->name('official.destroy');

    // Kyu & Dan Master
    Route::get('kyu', [KyuController::class, 'index'])->name('kyu.index');
    Route::post('kyu', [KyuController::class, 'store'])->name('kyu.store');
    Route::put('kyu/{kyu}', [KyuController::class, 'update'])->name('kyu.update');
    Route::delete('kyu/{kyu}', [KyuController::class, 'destroy'])->name('kyu.destroy');

    Route::get('technique', [TechniqueController::class, 'index'])->name('technique.index');
    Route::post('technique', [TechniqueController::class, 'store'])->name('technique.store');
    Route::put('technique/{technique}', [TechniqueController::class, 'update'])->name('technique.update');
    Route::delete('technique/{technique}', [TechniqueController::class, 'destroy'])->name('technique.destroy');

    Route::get('weight-class', [WeightClassController::class, 'index'])->name('weight-class.index');
    Route::post('weight-class', [WeightClassController::class, 'store'])->name('weight-class.store');
    Route::put('weight-class/{weightClass}', [WeightClassController::class, 'update'])->name('weight-class.update');
    Route::delete('weight-class/{weightClass}', [WeightClassController::class, 'destroy'])->name('weight-class.destroy');

    Route::get('payment-method', [PaymentMethodController::class, 'index'])->name('payment-method.index');
    Route::post('payment-method', [PaymentMethodController::class, 'store'])->name('payment-method.store');
    Route::put('payment-method/{paymentMethod}', [PaymentMethodController::class, 'update'])->name('payment-method.update');
    Route::delete('payment-method/{paymentMethod}', [PaymentMethodController::class, 'destroy'])->name('payment-method.destroy');

    Route::get('referee', [RefereeController::class, 'index'])->name('referee.index');
    Route::post('referee', [RefereeController::class, 'store'])->name('referee.store');
    Route::put('referee/{referee}', [RefereeController::class, 'update'])->name('referee.update');
    Route::delete('referee/{referee}', [RefereeController::class, 'destroy'])->name('referee.destroy');

    Route::get('clerk', [ClerkController::class, 'index'])->name('clerk.index');
    Route::post('clerk', [ClerkController::class, 'store'])->name('clerk.store');
    Route::put('clerk/{clerk}', [ClerkController::class, 'update'])->name('clerk.update');
    Route::delete('clerk/{clerk}', [ClerkController::class, 'destroy'])->name('clerk.destroy');
    Route::get('field-coordinator', [FieldCoordinatorController::class, 'index'])->name('field-coordinator.index');
    Route::post('field-coordinator', [FieldCoordinatorController::class, 'store'])->name('field-coordinator.store');
    Route::put('field-coordinator/{fieldCoordinator}', [FieldCoordinatorController::class, 'update'])->name('field-coordinator.update');
    Route::delete('field-coordinator/{fieldCoordinator}', [FieldCoordinatorController::class, 'destroy'])->name('field-coordinator.destroy');

    // User & Role Management
    Route::get('user', [UserController::class, 'index'])->name('user.index');
    Route::post('user', [UserController::class, 'store'])->name('user.store');
    Route::put('user/{user}', [UserController::class, 'update'])->name('user.update');
    Route::delete('user/{user}', [UserController::class, 'destroy'])->name('user.destroy');
});

// Pendaftaran
Route::prefix('admin/pendaftaran')->middleware(['auth', 'event.tenant'])->name('admin.pendaftaran.')->group(function () {
    Route::get('nomor-pertandingan/export', [RegistrationController::class, 'exportMatchGroups'])->name('nomor-pertandingan.export');
    Route::get('nomor-pertandingan', [RegistrationController::class, 'matchGroups'])->name('nomor-pertandingan');
    Route::get('registrasi/export', [RegistrationController::class, 'exportRegistrasi'])->name('registrasi.export');
    Route::get('registrasi', [RegistrationController::class, 'registrasi'])->name('registrasi');
    Route::get('registrasi/create', [RegistrationController::class, 'create'])->name('registrasi.create');
    Route::post('registrasi', [RegistrationController::class, 'store'])->name('registrasi.store');
    Route::get('registrasi/{registration}/detail', [RegistrationController::class, 'detail'])->name('registrasi.detail');
    Route::delete('registrasi/{registration}', [RegistrationController::class, 'destroy'])->name('registrasi.destroy');
    Route::post('registrasi/{registration}/delete', [RegistrationController::class, 'destroy'])->name('registrasi.delete');
    Route::patch('registrasi/{registration}/contingent', [RegistrationWizardController::class, 'updateContingent'])->name('registrasi.wizard.contingent');
    Route::post('registrasi/{registration}/officials', [RegistrationWizardController::class, 'saveOfficial'])->name('registrasi.wizard.officials.store');
    Route::post('registrasi/{registration}/officials/copy', [RegistrationWizardController::class, 'copyOfficial'])->name('registrasi.wizard.officials.copy');
    Route::post('registrasi/{registration}/officials/{official}', [RegistrationWizardController::class, 'saveOfficial'])->name('registrasi.wizard.officials.update');
    Route::delete('registrasi/{registration}/officials/{official}', [RegistrationWizardController::class, 'deleteOfficial'])->name('registrasi.wizard.officials.delete');
    Route::post('registrasi/{registration}/athletes', [RegistrationWizardController::class, 'saveAthlete'])->name('registrasi.wizard.athletes.store');
    Route::get('registrasi/{registration}/athletes/{athlete}/photo', [RegistrationWizardController::class, 'athletePhoto'])->name('registrasi.wizard.athletes.photo');
    Route::get('registrasi/{registration}/athletes/{athlete}/school-document', [RegistrationWizardController::class, 'schoolDocument'])->name('registrasi.wizard.athletes.school-document');
    Route::post('registrasi/{registration}/athletes/{athlete}/verify-school', [RegistrationWizardController::class, 'verifySchool'])->name('registrasi.wizard.athletes.verify-school');
    Route::post('registrasi/{registration}/athletes/copy', [RegistrationWizardController::class, 'copyAthlete'])->name('registrasi.wizard.athletes.copy');
    Route::post('registrasi/{registration}/athletes/{athlete}', [RegistrationWizardController::class, 'saveAthlete'])->name('registrasi.wizard.athletes.update');
    Route::patch('registrasi/{registration}/entries/{entry}/team', [RegistrationWizardController::class, 'updateTeam'])->name('registrasi.wizard.team');
    Route::post('registrasi/{registration}/recalculate', [RegistrationWizardController::class, 'recalculate'])->name('registrasi.wizard.recalculate');
    Route::post('registrasi/{registration}/entry-by-number', [RegistrationController::class, 'storeEntryByNumber'])->name('registrasi.entry-by-number');
    Route::post('registrasi/{registration}/athletes/{athlete}/match-category', [RegistrationController::class, 'storeRegistrationAthleteMatchCategoryEntry'])->name('registrasi.match-category.store');
    Route::delete('registrasi/{registration}/athletes/{athlete}/match-category/{entry}', [RegistrationController::class, 'destroyRegistrationAthleteMatchCategoryEntry'])->name('registrasi.match-category.destroy');
    Route::patch('registrasi/{registration}/athletes/{athlete}/match-category/{entry}/team', [RegistrationController::class, 'updateRegistrationAthleteTeam'])->name('registrasi.match-category.team');
    Route::post('registrasi/{registration}/match-category/{category}/teams/{teamNumber}/techniques', [RegistrationController::class, 'storeRegistrationTeamTechnique'])->name('registrasi.team-techniques.store');
    Route::delete('registrasi/{registration}/match-category/{category}/teams/{teamNumber}/techniques/{teamTechnique}', [RegistrationController::class, 'destroyRegistrationTeamTechnique'])->name('registrasi.team-techniques.destroy');
    Route::post('registrasi/{registration}/verify', [RegistrationController::class, 'verifyRegistration'])->name('registrasi.verify');
    Route::post('registrasi/{registration}/reject', [RegistrationController::class, 'rejectRegistration'])->name('registrasi.reject');
    Route::post('registrasi/{registration}/payment', [RegistrationController::class, 'submitPayment'])->name('registrasi.payment.submit');
    Route::post('registrasi/{registration}/payment/verify', [RegistrationController::class, 'verifyPayment'])->name('registrasi.payment.verify');
    Route::post('registrasi/{registration}/payment/reject', [RegistrationController::class, 'rejectPayment'])->name('registrasi.payment.reject');
    Route::get('registrasi/{registration}/payment-proof', [RegistrationController::class, 'downloadPaymentProof'])->name('registrasi.payment.proof');
    Route::get('verifikasi/export', [RegistrationController::class, 'exportVerifikasi'])->name('verifikasi.export');
    Route::get('verifikasi', [RegistrationController::class, 'verifikasi'])->name('verifikasi');
    Route::post('verifikasi/{athlete}/match-category', [RegistrationController::class, 'storeAthleteMatchCategoryEntry'])->name('verifikasi.match-category.store');
    Route::delete('verifikasi/{athlete}/match-category/{entry}', [RegistrationController::class, 'destroyAthleteMatchCategoryEntry'])->name('verifikasi.match-category.destroy');
});

// Pertandingan
Route::prefix('admin/pertandingan')->middleware(['auth', 'event.tenant'])->name('admin.pertandingan.')->group(function () {
    Route::get('drawing', [TournamentController::class, 'drawing'])->name('drawing');
    Route::post('drawing/generate', [TournamentController::class, 'generate'])->name('drawing.generate');
    Route::post('drawing/category/{matchCategory}/generate', [TournamentController::class, 'redrawCategory'])->name('drawing.category.generate');
    Route::put('drawing/category/{matchCategory}/format', [TournamentController::class, 'updateCategoryFormat'])->name('drawing.category.format');
    Route::post('drawing/publish', [TournamentController::class, 'publish'])->name('drawing.publish');
    Route::post('drawing/unpublish', [TournamentController::class, 'unpublish'])->name('drawing.unpublish');
    Route::put('drawing/matches/{tournamentMatch}/schedule', [TournamentController::class, 'updateSchedule'])->name('drawing.matches.schedule');
    Route::post('drawing/start', [TournamentController::class, 'start'])->name('drawing.start');
    Route::post('drawing/complete', [TournamentController::class, 'complete'])->name('drawing.complete');
    Route::post('drawing/reset-competition', [TournamentController::class, 'resetCompetition'])->name('drawing.reset-competition');
    Route::delete('drawing/reset', [TournamentController::class, 'reset'])->name('drawing.reset');
    Route::get('jadwal', [TournamentController::class, 'schedule'])->name('schedule');
    Route::get('jadwal/export', [TournamentController::class, 'exportSchedule'])->name('schedule.export');
    Route::put('jadwal/matches/{tournamentMatch}', [TournamentController::class, 'updateSchedule'])->name('schedule.matches.update');
    Route::delete('jadwal/matches/{tournamentMatch}', [TournamentController::class, 'unscheduleMatch'])->name('schedule.matches.destroy');
    Route::get('wasit', [EventRefereeController::class, 'index'])->name('wasit.index');
    Route::post('wasit/courts/generate', [EventRefereeController::class, 'generateCourtPanels'])->name('wasit.courts.generate');
    Route::post('wasit/courts/{eventCourt}/rotate', [EventRefereeController::class, 'rotateCourtPanel'])->name('wasit.courts.panel.rotate');
    Route::put('wasit/courts/{eventCourt}/panel', [EventRefereeController::class, 'updateCourtPanel'])->name('wasit.courts.panel.update');
    Route::delete('wasit/courts/{eventCourt}/panel', [EventRefereeController::class, 'resetCourtPanel'])->name('wasit.courts.panel.reset');
    Route::put('wasit/{referee}/attendance', [EventRefereeController::class, 'updateAttendance'])->name('wasit.attendance.update');
    Route::post('wasit/{referee}/account', [EventRefereeController::class, 'upsertAccount'])->name('wasit.account.store');
    Route::get('merge', [TournamentController::class, 'merge'])->name('merge');
    Route::post('merge/combine', [TournamentController::class, 'storeCombinedMerge'])->name('merge.combine');
    Route::delete('merge/combine/{matchCategory}', [TournamentController::class, 'destroyCombinedMerge'])->name('merge.combine.destroy');
    Route::post('merge/{matchCategory}', [TournamentController::class, 'storeMerge'])->name('merge.store');

    // Penimbangan Badan Hari-H (Weigh-In Station)
    Route::get('timbang-badan', [WeighInController::class, 'index'])->name('weigh-in.index');
    Route::post('timbang-badan/entry/{entry}', [WeighInController::class, 'update'])->name('weigh-in.update');
    Route::post('timbang-badan/category/{matchCategory}/lock', [WeighInController::class, 'lock'])->name('weigh-in.lock');
    Route::post('timbang-badan/category/{matchCategory}/unlock', [WeighInController::class, 'unlock'])->name('weigh-in.unlock');
    Route::post('timbang-badan/matches/{tournamentMatch}/walkover', [WeighInController::class, 'walkover'])->name('weigh-in.walkover');
    Route::get('timbang-badan/export', [WeighInController::class, 'export'])->name('weigh-in.export');
});

// Arbitrase & Wasit
Route::prefix('admin/arbitrase')->middleware(['auth', 'event.tenant'])->name('admin.arbitrase.')->group(function () {
    Route::get('wasit', [ArbitrationController::class, 'referee'])->name('wasit');
    Route::post('wasit', [ArbitrationController::class, 'storeReferee'])->name('wasit.store');
    Route::put('wasit/{referee}', [ArbitrationController::class, 'updateReferee'])->name('wasit.update');
    Route::delete('wasit/{referee}', [ArbitrationController::class, 'destroyReferee'])->name('wasit.destroy');
    Route::get('penugasan', [ArbitrationController::class, 'assignment'])->name('penugasan');
    Route::post('penugasan/{court}/staff', [ArbitrationController::class, 'storeCourtAssignment'])->name('penugasan.staff.store');
    Route::delete('penugasan/{court}/staff/{assignment}', [ArbitrationController::class, 'destroyCourtAssignment'])->name('penugasan.staff.destroy');
    Route::get('scoring', [ArbitrationController::class, 'scoring'])->name('scoring');
    Route::get('scoring/export', [ArbitrationController::class, 'exportScores'])->name('scoring.export');
    Route::get('scoring/print/embu/{embuJudgeScore}', [ArbitrationScorePrintController::class, 'embu'])->name('scoring.print.embu');
    Route::get('scoring/print/randori/{randoriScore}', [ArbitrationScorePrintController::class, 'randori'])->name('scoring.print.randori');
    Route::put('scoring/embu/{tournamentMatch}', [EmbuJudgeScoreController::class, 'update'])->name('scoring.embu.update');
    Route::get('evaluasi', [ArbitrationEvaluationController::class, 'index'])->name('evaluation');
    Route::get('evaluasi/export', [ArbitrationEvaluationController::class, 'export'])->name('evaluation.export');
});

// Panitera
Route::post('admin/panitera/event-context', PaniteraEventContextController::class)
    ->middleware('auth')
    ->name('admin.panitera.event-context.store');
Route::prefix('admin/panitera')->middleware(['auth', 'event.tenant'])->name('admin.panitera.')->group(function () {
    Route::get('scoring', PaniteraDashboardController::class)->name('scoring.index');
    Route::get('scoring/monitors/{eventCourt}', [PaniteraCourtMonitorController::class, 'show'])->name('monitors.show');
    Route::get('scoring/monitors/{eventCourt}/state', [PaniteraCourtMonitorController::class, 'state'])->name('monitors.state');
    Route::get('scoring/monitors/{eventCourt}/timer', [PaniteraTimerController::class, 'court'])->name('monitors.timer');
    Route::get('scoring/matches/{tournamentMatch}', [PaniteraMatchController::class, 'show'])->name('matches.show');
    Route::get('scoring/matches/{tournamentMatch}/timer', [PaniteraTimerController::class, 'show'])->name('matches.timer');
    Route::put('scoring/matches/{tournamentMatch}/workflow', [PaniteraMatchWorkflowController::class, 'update'])->name('matches.workflow.update');
    Route::put('scoring/matches/{tournamentMatch}/embu-penalties', [EmbuPenaltyController::class, 'update'])->name('matches.embu-penalties.update');
    Route::post('scoring/matches/{tournamentMatch}/embu-result', [VerifiedEmbuResultController::class, 'store'])->name('matches.embu-result.store');
    Route::delete('scoring/matches/{tournamentMatch}/embu-result', [VerifiedEmbuResultController::class, 'destroy'])->name('matches.embu-result.destroy');
    Route::get('scoring/embu-result', [EmbuResultController::class, 'index'])->name('embu-result.index');
    Route::post('scoring/embu-result/{tournamentMatch}', [EmbuResultController::class, 'store'])->name('embu-result.store');
    Route::post('scoring/embu-result/{matchCategory}/advance-finalists', [EmbuResultController::class, 'advanceFinalists'])->name('embu-result.advance-finalists');
    Route::post('scoring/embu-result/{matchCategory}/confirm-champions', [EmbuResultController::class, 'confirmChampions'])->name('embu-result.confirm-champions');
    Route::post('scoring/embu-result/{tournamentMatch}/manual-tiebreak', [EmbuResultController::class, 'resolveManualTiebreak'])->name('embu-result.manual-tiebreak');
    Route::get('scoring/randori-result', [RandoriResultController::class, 'index'])->name('randori-result.index');
    Route::put('scoring/randori-result/{tournamentMatch}/draft', [RandoriResultController::class, 'updateDraft'])->name('randori-result.draft.update');
    Route::post('scoring/randori-result/{tournamentMatch}', [RandoriResultController::class, 'store'])->name('randori-result.store');
    Route::post('scoring/randori-result/{tournamentMatch}/lock', [RandoriResultController::class, 'lock'])->name('randori-result.lock');
    Route::get('scoring/champions', [ChampionResultController::class, 'index'])->name('champions.index');
    Route::post('scoring/champions/{matchCategory}/generate', [ChampionResultController::class, 'generate'])->name('champions.generate');
    Route::put('scoring/champions/{matchCategory}', [ChampionResultController::class, 'update'])->name('champions.update');

    // VAR (Video Assistant Review)
    Route::post('scoring/matches/{tournamentMatch}/var-review', [VarReviewController::class, 'store'])->name('matches.var.store');
    Route::post('scoring/var-review/{review}/resolve', [VarReviewController::class, 'resolve'])->name('var.resolve');
    Route::get('scoring/matches/{tournamentMatch}/var-history', [VarReviewController::class, 'history'])->name('matches.var.history');
});

// Mode Pelatihan / Simulasi Sandbox
Route::prefix('admin/simulation')->middleware(['auth', 'event.tenant'])->name('admin.simulation.')->group(function () {
    Route::post('toggle', [TrainingModeController::class, 'toggle'])->name('toggle');
    Route::post('reset', [TrainingModeController::class, 'reset'])->name('reset');
    Route::post('seed', [TrainingModeController::class, 'seed'])->name('seed');
});

// Laporan & Hasil
Route::prefix('admin/laporan')->middleware(['auth', 'event.tenant'])->name('admin.laporan.')->group(function () {
    Route::get('/', [ReportController::class, 'index'])->name('index');
    Route::get('export', [ReportController::class, 'export'])->name('export');
    Route::get('berita-acara', [ReportController::class, 'printBeritaAcara'])->name('berita-acara');
    Route::get('cetak/embu/{embuScore}', [ReportController::class, 'printEmbu'])->name('print.embu');
    Route::get('cetak/randori/{randoriScore}', [ReportController::class, 'printRandori'])->name('print.randori');
    Route::get('hasil', [ReportController::class, 'medals'])->name('hasil');
    Route::get('rekap-embu', [ReportController::class, 'recap'])->name('rekap-embu');
});

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::get('wasit/login', [AuthenticatedSessionController::class, 'create'])->name('wasit.login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
    Route::post('login/nik', NikLoginController::class)
        ->middleware('throttle:15,1')
        ->name('login.nik');
    Route::post('login/panitera-token', PaniteraTokenLoginController::class)
        ->middleware('throttle:10,1')
        ->name('login.panitera-token');

    Route::get('register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('register', [RegisteredUserController::class, 'store'])
        ->middleware('throttle:30,1');
});

// Wasit signed check-in (accessible with or without login via signed HMAC URL)
Route::match(['get', 'post'], 'wasit/check-in/event/{event}', [RefereeCheckInController::class, 'event'])
    ->middleware(['signed', 'throttle:30,1'])
    ->name('wasit.check-in.event');
Route::match(['get', 'post'], 'wasit/check-in/event/{event}/court/{eventCourt}/{role?}', [RefereeCheckInController::class, 'court'])
    ->middleware(['signed', 'throttle:30,1'])
    ->name('wasit.check-in.court');

Route::middleware('auth')->group(function () {
    Route::get('wasit', RefereePortalController::class)->middleware('event.tenant')->name('wasit.portal');
    Route::get('absensi-wasit', RefereeAttendanceHistoryController::class)->middleware('event.tenant')->name('wasit.absensi');
    Route::get('wasit/history', RefereeScoreHistoryController::class)->middleware('event.tenant')->name('wasit.history');
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
});

Route::get('/preview-email', function () {
    $user = new User([
        'name' => 'Sensei Budi Santoso',
        'email' => 'kontingen.garuda@gmail.com',
    ]);

    $contingent = new Contingent([
        'name' => 'Dojo Garuda Sakti Surabaya',
        'city' => 'Kota Surabaya',
        'manager_name' => 'Sensei Budi Santoso',
        'phone' => '0812-3456-7890',
        'address' => 'Jl. Pemuda No. 45, Embong Kaliasin, Kec. Genteng, Kota Surabaya, Jawa Timur 60271',
        'status' => 'pending',
    ]);

    return (new ContingentAccountCreatedMail($user, $contingent, 'Kempo-8A7B9C'))
        ->render();
})->name('email.preview');
