// Simple i18n helper for GymNerd
(function(global){
    const COOKIE_NAME = 'gn_lang';
    const SUPPORTED = ['en', 'pt-BR'];
    const translations = {
        'en': {
            language_label: 'Language',
            new_routine: 'New Routine',
            new_routine_entry: 'New Routine Entry',
            new_weight_entry: 'New Weight Entry',
            log_routine: 'Log Routine',
            log_weight: 'Log Weight',
            save_session: '💾 Save Session',
            save_weight: '💾 Save Weight',
            cancel: 'Cancel',
            add_exercise: '🔍 Add Exercise',
            save_routine: 'Save Routine',
            create_custom_ex: '➕ Create Custom Exercise',
            search_placeholder: 'Search by name...',
            routine_name_label: 'Routine Name',
            routine_name_placeholder: 'e.g. Upper Push',
            continue_btn: 'Continue',
            discard_btn: 'Discard',
            select_routine: 'Select a Routine',
            start_session: '🚀 Start Session',
            finish_routine: '🏁 Finish Routine',
            play_exercise: '🎯 Play this exercise',
            unfinished_session: '🏃 Unfinished session found',
            no_weight_data: 'No weight data',
            app_name: 'GymNerd',
            start_routine: '🚀 Start Routine',
            routines: '🏋 Routines',
            history: '📋 History',
            statistics: '📊 Statistics',
            total_workouts: 'Total Workouts',
            best_lift: 'Best Lift',
            current_streak: 'Current Streak',
            days: 'Days',
            start_your_journey: 'Start your journey!',
            best_record: 'Best Record',
            no_records_yet: 'No records yet',
            data_management: '⚙️ Data Management',
            cloud_sync: 'Cloud Sync',
            sync_to_drive: '☁️ Sync to Google Drive',
            restore_from_drive: '📥 Restore from Google Drive',
            export_json: '📤 Export 4 JSON Files',
            process_import: '📥 Process Import',
            local_mode: 'Local Mode',
            connected: 'Connected to Drive',
            not_connected: 'Not Connected',
            clear_all: 'Clear All',
            clear_local: 'Clear Local',
            logout: 'Logout',
            login: 'Login',
            running_local_mode: 'Running in Local Mode.',
            sync_your_data: 'Sync your workout data with Google Drive.',
            enter_app: 'Enter App',
            sign_in_with_google: 'Sign in with Google',
            sync_pending: '☁️ Sync Pending Changes',
            // UI labels and tooltips
            choose_routine_option: '-- Choose Routine --',
            reset_timer: 'Reset Timer',
            prev_exercise: 'Previous Exercise',
            next_exercise: 'Next Exercise',
            prev_set: 'Previous Set',
            skip_set: 'Skip Set',
            complete_set: 'Complete Set',
            drag_to_reorder: 'Drag to reorder',
            reps: 'Reps',
            kg: 'Kg',
            exercise_label: 'Exercise',
            routine_label: 'Routine',
            sets: 'sets',
            // dialog and alert strings
            discard_unfinished_routine: 'Discard unfinished routine?',
            please_select_at_least_one_exercise: 'Please select at least one exercise.',
            skip_rest_confirm: 'Skip the rest of this exercise?',
            new_streak_record: '🎉 NEW STREAK RECORD: {n} DAYS!',
            debug_error: 'DEBUG ERROR: {msg}\n{stack}',
            missing_name_or_exercises: 'Missing name or exercises for the routine',
            please_enter_exercise_name: 'Please enter a name for the exercise.',
            exercise_updated: 'Exercise updated!',
            exercise_saved_local: 'Exercise saved to your local collection!',
            failed_save_exercise: 'Failed to save exercise: {msg}',
            delete_all_entries_for_date: 'Delete all entries for {date}?',
            danger_delete_all: 'DANGER: This will permanently delete all local data and your backup on Google Drive. Continue?',
            all_data_cleared: 'All data cleared successfully.',
            failed_clear_data: 'Failed to clear some data. Check console.',
            delete_routine_confirm: 'Delete routine?',
            google_session_expired: 'Your Google session expired. Please login again to keep syncing.',
            auto_sync_failed: 'Auto-sync failed: {msg}',
            import_successful: 'Import successful!',
            import_failed: 'Error importing data. Check console for details.',
            no_backup_found: 'No backup found on Google Drive.',
            add_selected: 'Add Selected',
            selected: 'selected',
            no_exercises_found: 'No exercises found',
            edit: 'Edit',
            custom_exercise: 'Custom Exercise',
            copy_exercise: 'Copy Exercise',
            name_label: 'Name',
            name_pt_label: 'Name (Portuguese)',
            type_label: 'Type',
            image_label: 'Image',
            tap_to_upload: '📸 Tap to upload',
            edit_routine: 'Edit Routine',
            edit_exercise: 'Edit Exercise',
            copy_exercise_label: 'Copy Exercise',
            add_set: '+ Add Set'
        },
        'pt-BR': {
            language_label: 'Idioma',
            new_routine: 'Nova Rotina',
            new_routine_entry: 'Nova Entrada de Rotina',
            new_weight_entry: 'Nova Entrada de Peso',
            log_routine: 'Registrar Rotina',
            log_weight: 'Registrar Peso',
            save_session: '💾 Salvar Sessão',
            save_weight: '💾 Salvar Peso',
            cancel: 'Cancelar',
            add_exercise: '🔍 Adicionar Exercício',
            save_routine: 'Salvar Rotina',
            create_custom_ex: '➕ Criar Exercício',
            search_placeholder: 'Pesquisar por nome...',
            continue_btn: 'Continuar',
            discard_btn: 'Descartar',
            select_routine: 'Selecione uma Rotina',
            start_session: '🚀 Iniciar Sessão',
            finish_routine: '🏁 Finalizar Rotina',
            play_exercise: '🎯 Fazer este exercício',
            unfinished_session: '🏃 Sessão não finalizada encontrada',
            no_weight_data: 'Nenhum dado de peso',
            app_name: 'GymNerd',
            start_routine: '🚀 Iniciar Treino',
            routines: '🏋 Rotinas',
            history: '📋 Histórico',
            statistics: '📊 Estatísticas',
            total_workouts: 'Total de Treinos',
            best_lift: 'Melhor Levantamento',
            current_streak: 'Sequência Atual',
            days: 'Dias',
            start_your_journey: 'Comece sua jornada!',
            best_record: 'Melhor Recorde',
            no_records_yet: 'Nenhum registro ainda',
            data_management: '⚙️ Gerenciar Dados',
            cloud_sync: 'Sincronização',
            sync_to_drive: '☁️ Sincronizar com Google Drive',
            restore_from_drive: '📥 Restaurar do Google Drive',
            export_json: '📤 Exportar 4 arquivos JSON',
            process_import: '📥 Processar Importação',
            local_mode: 'Modo Local',
            connected: 'Conectado ao Drive',
            not_connected: 'Não Conectado',
            clear_all: 'Apagar Tudo',
            clear_local: 'Apagar Local',
            logout: 'Sair',
            login: 'Entrar',
            running_local_mode: 'Rodando em Modo Local.',
            sync_your_data: 'Sincronize seus treinos com o Google Drive.',
            enter_app: 'Entrar no App',
            sign_in_with_google: 'Entrar com Google',
            sync_pending: '☁️ Sincronizar Alterações',
            // UI labels and tooltips
            choose_routine_option: '-- Escolha uma Rotina --',
            reset_timer: 'Redefinir Temporizador',
            prev_exercise: 'Exercício Anterior',
            next_exercise: 'Próximo Exercício',
            prev_set: 'Série Anterior',
            skip_set: 'Pular Série',
            complete_set: 'Completar Série',
            drag_to_reorder: 'Arraste para reordenar',
            reps: 'Repetições',
            kg: 'Kg',
            exercise_label: 'Exercício',
            routine_label: 'Rotina',
            sets: 'séries',
            routine_name_label: 'Nome da Rotina',
            routine_name_placeholder: 'ex: Peito / Empurrar',
            // dialog and alert strings
            discard_unfinished_routine: 'Descartar rotina não finalizada?',
            please_select_at_least_one_exercise: 'Por favor, selecione pelo menos um exercício.',
            skip_rest_confirm: 'Pular o restante deste exercício?',
            new_streak_record: '🎉 NOVO RECORD: {n} DIAS!',
            debug_error: 'ERRO DE DEBUG: {msg}\n{stack}',
            missing_name_or_exercises: 'Nome ou exercícios ausentes para a rotina',
            please_enter_exercise_name: 'Por favor, insira um nome para o exercício.',
            exercise_updated: 'Exercício atualizado!',
            exercise_saved_local: 'Exercício salvo na sua coleção local!',
            failed_save_exercise: 'Falha ao salvar exercício: {msg}',
            delete_all_entries_for_date: 'Apagar todas as entradas de {date}?',
            danger_delete_all: 'PERIGO: Isso apagará permanentemente todos os dados locais e seu backup no Google Drive. Continuar?',
            all_data_cleared: 'Todos os dados foram apagados com sucesso.',
            failed_clear_data: 'Falha ao apagar alguns dados. Verifique o console.',
            delete_routine_confirm: 'Apagar rotina?',
            google_session_expired: 'Sua sessão do Google expirou. Faça login novamente para continuar sincronizando.',
            auto_sync_failed: 'Falha na sincronização automática: {msg}',
            import_successful: 'Importação bem-sucedida!',
            import_failed: 'Erro ao importar dados. Verifique o console para mais detalhes.',
            no_backup_found: 'Nenhum backup encontrado no Google Drive.',
            add_selected: 'Adicionar Selecionados',
            selected: 'selecionado(s)',
            no_exercises_found: 'Nenhum exercício encontrado',
            edit: 'Editar',
            custom_exercise: 'Exercício Personalizado',
            copy_exercise: 'Copiar Exercício',
            name_label: 'Nome',
            name_pt_label: 'Nome (Português)',
            type_label: 'Tipo',
            image_label: 'Imagem',
            tap_to_upload: '📸 Toque para enviar',
            edit_routine: 'Editar Rotina',
            edit_exercise: 'Editar Exercício',
            copy_exercise_label: 'Copiar Exercício',
            add_set: '+ Adicionar Série'
        }
    };

    function readCookie(name) {
        const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return v ? decodeURIComponent(v.pop()) : null;
    }

    function setCookie(name, value, days = 365) {
        const d = new Date(); d.setTime(d.getTime() + (days*24*60*60*1000));
        // include SameSite to improve behavior on modern browsers
        const cookieStr = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
        try {
            document.cookie = cookieStr;
            console.debug('i18n: set cookie', cookieStr);
        } catch (e) {
            console.warn('i18n: failed setting cookie', e);
        }
    }

    function detectDefault() {
        const nav = navigator.language || navigator.userLanguage || 'en';
        if (nav.startsWith('pt')) return 'pt-BR';
        return 'en';
    }

    const i18n = {
        get current() {
            // Prefer explicit stored choice in localStorage (more reliable in some contexts)
            try {
                const ls = localStorage.getItem(COOKIE_NAME);
                if (ls && SUPPORTED.includes(ls)) return ls;
            } catch(e) {}
            const c = readCookie(COOKIE_NAME);
            if (c && SUPPORTED.includes(c)) return c;
            return detectDefault() || 'en';
        },
        setLanguage(lang) {
            if (!lang || !SUPPORTED.includes(lang)) lang = 'en';
            // persist selection: try cookie first, but always save to localStorage as fallback
            try { setCookie(COOKIE_NAME, lang, 3650); } catch(e) {}
            try { localStorage.setItem(COOKIE_NAME, lang); } catch(e) {}
                // Apply translations immediately for the whole document
                applyTranslations(document);
                // Also schedule a microtask re-apply in case some elements are added synchronously
                setTimeout(() => { try { applyTranslations(document); } catch(e){} }, 0);
            // update any selects with class .gn-lang-select
            const sels = document.querySelectorAll('.gn-lang-select');
            sels.forEach(s => { try { s.value = lang; } catch(e){} });
            // notify other parts of the app
                try { document.dispatchEvent(new CustomEvent('gn_language_changed', { detail: { lang } })); } catch(e){}
                // Trigger some common render hooks if present
                try { if (typeof window.renderAuthStatus === 'function') window.renderAuthStatus('auth-status-container'); } catch(e){}
                try { if (typeof window.GN_I18N !== 'undefined') window.GN_I18N.applyTranslations(document.getElementById('auth-blocker') || document); } catch(e){}
        },
        t(key) {
            const lang = i18n.current;
            return (translations[lang] && translations[lang][key]) || (translations['en'] && translations['en'][key]) || key;
        }
    };

    function applyTranslations(root = document) {
        // elements with data-i18n attribute: set textContent
        const els = root.querySelectorAll('[data-i18n]');
        els.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = i18n.t(key);
        });

        // replace placeholders for attributes like placeholder or value
        const attrEls = root.querySelectorAll('[data-i18n-attr]');
        attrEls.forEach(el => {
            const map = el.getAttribute('data-i18n-attr');
            try {
                const obj = JSON.parse(map);
                Object.keys(obj).forEach(attr => {
                    const key = obj[attr];
                    el.setAttribute(attr, i18n.t(key));
                });
            } catch(e) {}
        });
    }

    // Expose
    global.GN_I18N = i18n;
    global.GN_I18N.applyTranslations = applyTranslations;
    // Helper: choose exercise name based on current language
    global.GN_I18N.exerciseName = function(ex) {
        if (!ex) return '';
        try {
            const lang = i18n.current;
            if ((lang === 'pt-BR' || lang.startsWith('pt')) && ex.namePT) return ex.namePT;
        } catch(e) {}
        return ex.name || ex.namePT || '';
    };

    // On load, set selector values for any language selects and apply translations
    document.addEventListener('DOMContentLoaded', () => {
        const sels = document.querySelectorAll('.gn-lang-select');
        sels.forEach(s => { try { s.value = i18n.current; } catch(e){} });
        applyTranslations();
    });

    // Delegate: respond to any change on .gn-lang-select to switch language immediately
    document.addEventListener('change', (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains('gn-lang-select')) {
            i18n.setLanguage(t.value);
        }
    });

})(window);
