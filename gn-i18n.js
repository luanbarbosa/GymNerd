(function(){
    window.GN_I18N = {
        translations: {
            en: {
                new_routine_btn: '+ New Routine',
                no_routines_placeholder: 'No routines yet. Click <strong>New Routine</strong> to create one.',
                routine_not_found: 'Routine not found.',
                page_routine_new: 'New Routine',
                page_routine_edit: 'Edit Routine',
                routine_name_label: 'Routine Name',
                routine_name_placeholder: 'e.g.: Upper Push',
                routine_exercises_label: 'Routine Exercises',
                add_exercise: '🔍 Search Exercise',
                new: 'New',
                no_exercises_placeholder: 'No exercises — click "Search Exercise" to start',
                save_routine: 'Save Routine',
                cancel: 'Cancel',
                add_exercise_modal_title: 'Add Exercise',
                custom_exercise_title: 'Custom Exercise',
                exercise_name_label: 'Name',
                exercise_name_pt_label: 'Portuguese name (optional)',
                exercise_type_label: 'Type',
                exercise_image_label: 'Image',
                save_exercise_btn: 'Save Exercise',
                search_placeholder: 'Search by exercise name...',
                selected: 'selected',
                add_selected: 'Add Selected',
                apply: 'Apply',
                title_main: 'GymNerd',
                sync_pending: '☁️ Sync Pending Changes',
                start_routine: '🚀 Start Routine',
                menu_start_routine: '🚀 Start Routine',
                page_start_routine: 'Start Routine',
                routines: '🏋 Routines',
                menu_routines: '🏋 Routines',
                page_routines: 'Routines',
                history: '📋 History',
                menu_history: '📋 History',
                page_history: 'History',
                statistics: '📊 Statistics',
                menu_statistics: '📊 Statistics',
                page_statistics: 'Statistics',
                menu_settings: '⚙️ Settings',
                page_settings: 'Settings',
                data_management: 'Data Management',
                cloud_sync: 'Cloud Sync',
                sync_to_drive: 'Sync to Google Drive',
                restore_from_drive: 'Restore from Google Drive',
                backup: 'Local Backup',
                export_json: 'Download backup files',
                restore: 'Restore from local backup (.json)',
                label_images: 'Custom images',
                label_exercises: 'Custom Exercises',
                label_routines: 'Routines',
                label_history: 'History',
                process_import: 'Import',
                sign_in_with_google: 'Sign in with Google',

                import_success: 'Import successful!',
                import_error: 'Error importing data. Check console for details.',
                no_backup: 'No backup found on Google Drive.',
                overwrite_confirm: 'This will overwrite all local data with the version from Google Drive. Continue?',
                session_expired: 'Your session has expired. Please login again.',
                restore_failed_prefix: 'Restore failed: ',
                restoring_from_drive: 'Restoring from Google Drive...',
                deleting_backup_drive: 'Deleting backup from Google Drive...',
                google_session_expired: 'Your Google session expired. Please login again to keep syncing.',
                auto_sync_failed_prefix: 'Auto-sync failed: ',
                sync_failed_try_home: 'Something went wrong with the synchronization with Google Drive. Try again from the home screen.',
                danger_clear_confirm: 'DANGER: This will permanently delete all local data and your backup on Google Drive. Continue?',
                all_data_cleared: 'All data cleared successfully.',
                failed_to_clear_data: 'Failed to clear some data. Check console.',
                syncing_with_drive: 'Syncing with Google Drive...',
                refreshing_session: 'Refreshing session...',
                confirm_delete_routine: 'Delete routine?',
                delete_routine: 'Delete routine',
                missing_routine_name: 'Missing name or exercises in the routine',
                no_exercise_found: 'No exercise found',
                please_enter_exercise_name: 'Please enter a name for the exercise.',
                exercise_updated: 'Exercise updated!',
                exercise_saved_local: 'Exercise saved to your local collection!',
                failed_to_save_exercise_prefix: 'Failed to save exercise: ',
                you_can_also_clear_local_data: 'You can also clear local data from the settings if you prefer.' ,

                local_mode: 'Local Mode',
                running_local_mode_msg: 'Running in Local Mode.',
                sync_workout_msg: 'Sync your workout data with Google Drive.',
                language: 'Language',
                enter_app: 'Enter App',
                connected_to_drive: 'Connected to Drive',
                clear_all: 'Clear All',
                logout: 'Logout',
                not_connected: 'Not Connected',
                clear_local: 'Clear Local',
                login: 'Login',

                welcome_back_syncing: 'Welcome back!\nSyncing your data...',
                retry: 'Retry',
                retrying: 'Retrying...',
                failed_to_refresh_session: 'Could not refresh your session automatically. Please sign in again.'
                ,
                /* Statistics page */
                workout_frequency: 'Workout Frequency',
                monthly: 'Monthly',
                yearly: 'Yearly',
                weight_progress: 'Weight Progress',
                no_weight_data: 'No weight data',
                weight_kg: 'Weight (kg)',
                unknown_exercise: 'Unknown Exercise',
                current_streak: 'Current Streak',
                days: 'Days',
                start_your_journey: 'Start your journey!',
                best_record: 'Best Record',
                no_records_yet: 'No records yet',
                keep_it_up: 'Keep it up!',
                days_since_last: 'days since last',
                personal_best: 'Personal Best'
                ,
                /* Exercise types */
                exercise_type_shoulder: 'Shoulder',
                exercise_type_chest: 'Chest',
                exercise_type_back: 'Back',
                exercise_type_legs: 'Legs',
                exercise_type_arms: 'Arms',
                exercise_type_core: 'Core',
                exercise_type_abs: 'Abs',
                exercise_type_cardio: 'Cardio',
                exercise_type_other: 'Other'
                ,
                /* History page specific keys (unique names) */
                history_header: 'History',
                history_weight_header: 'Weight History',
                history_workout_header: 'Workout History',
                history_no_weight: 'No weight history',
                history_no_history: 'No history data',
                history_btn_new_routine: 'New Routine Entry',
                history_btn_new_weight: 'New Weight Entry',
                history_section_log_routine: 'Log Routine',
                history_section_log_weight: 'Log Weight',
                history_placeholder_choose_routine: '-- Choose Routine --',
                history_save_session: '💾 Save Session',
                history_save_weight: '💾 Save Weight',
                history_cancel: 'Cancel',
                history_weight_kg: 'Weight (kg)',
                history_weight_saved: 'Weight saved!',
                history_sets: 'Sets',
                history_kg: 'Kg',
                history_reps: 'Reps',
                add_set: 'Add new set',
                history_delete_session: 'Delete Session',
                history_confirm_delete: 'Delete all entries for {date}?',
                history_fmt_sets_short: 'sets',
                history_fmt_kg_suffix: 'kg'
                ,
                /* Livesession specific */
                resume_unfinished: '🏃 Unfinished session found',
                resume_continue: 'Continue',
                resume_discard: 'Discard',
                label_select_routine: 'Select a Routine',
                choose_routine_placeholder: '-- Choose Routine --',
                start_session: '🚀 Start Session',
                play_exercise: '🎯 Play this exercise',
                finish_routine: '🏁 Finish Routine',
                finished_title: 'Great job!',
                finished_subtitle: "You've completed all exercises for this session.",
                save_routine_warning: '⚠️ You updated some values — should we also update the routine or is this a one-time thing?',
                save_routine_note: 'The statistics will always be updated',
                save_changes_to_routine: 'Save changes to routine',
                routine_saved: 'Routine saved',
                reset_timer: 'Reset Timer',
                previous_exercise: 'Previous Exercise',
                next_exercise: 'Next Exercise',
                previous_set: 'Previous Set',
                skip_set: 'Skip Set',
                complete_set: 'Complete Set',
                please_select_exercise: 'Please select at least one exercise.',
                discard_confirm: 'Discard unfinished routine?',
                skip_exercise_confirm: 'Skip the rest of this exercise?',
                new_streak_record: '🎉 NEW STREAK RECORD: {n} DAYS!',
                debug_error_prefix: 'DEBUG ERROR: '
                ,
                drag_to_reorder: 'Drag to reorder'
            },
            pt: {
                new_routine_btn: '+ Nova Rotina',
                no_routines_placeholder: 'Ainda não há rotinas. Clique em <strong>Nova Rotina</strong> para criar uma.',
                routine_not_found: 'Rotina não encontrada.',
                page_routine_new: 'Nova Rotina',
                page_routine_edit: 'Editar Rotina',
                routine_name_label: 'Nome da Rotina',
                routine_name_placeholder: 'ex.: Empurrão Superior',
                routine_exercises_label: 'Exercícios da Rotina',
                add_exercise: '🔍 Procurar Exercício',
                new: 'Novo',
                no_exercises_placeholder: 'Nenhum exercício — clique em "Adicionar Exercício" para começar',
                save_routine: 'Salvar Rotina',
                cancel: 'Cancelar',
                add_exercise_modal_title: 'Adicionar Exercício',
                custom_exercise_title: 'Exercício Personalizado',
                exercise_name_label: 'Nome',
                exercise_name_pt_label: 'Nome (Português)',
                exercise_type_label: 'Tipo',
                exercise_image_label: 'Imagem',
                save_exercise_btn: 'Salvar Exercício',
                search_placeholder: 'Pesquisar por nome do exercício...',
                selected: 'selecionados',
                add_selected: 'Adicionar Selecionados',
                apply: 'Aplicar',
                title_main: 'GymNerd',
                sync_pending: '☁️ Alterações pendentes',
                start_routine: '🚀 Iniciar Treino',
                menu_start_routine: '🚀 Iniciar Treino',
                page_start_routine: 'Iniciar Treino',
                routines: '🏋 Rotinas',
                menu_routines: '🏋 Rotinas',
                page_routines: 'Rotinas',
                history: '📋 Histórico',
                menu_history: '📋 Histórico',
                page_history: 'Histórico',
                statistics: '📊 Estatísticas',
                menu_statistics: '📊 Estatísticas',
                page_statistics: 'Estatísticas',
                menu_settings: '⚙️ Configurações',
                page_settings: 'Configurações',
                data_management: 'Gerenciar Dados',
                cloud_sync: 'Sincronização com a Nuvem',
                sync_to_drive: 'Sincronizar com Google Drive',
                restore_from_drive: 'Restaurar do Google Drive',
                backup: 'Backup local',
                export_json: 'Baixar arquivos de backup',
                restore: 'Restaurar do backup local (.json)',
                label_images: 'Imagens customizadas',
                label_exercises: 'Exercícios customizados',
                label_routines: 'Rotinas',
                label_history: 'Histórico',
                process_import: 'Importar',
                sign_in_with_google: 'Entrar com o Google',

                import_success: 'Importação bem-sucedida!',
                import_error: 'Erro ao importar dados. Verifique o console para detalhes.',
                no_backup: 'Nenhum backup encontrado no Google Drive.',
                overwrite_confirm: 'Isto irá sobrescrever todos os dados locais com a versão do Google Drive. Continuar?',
                session_expired: 'Sua sessão expirou. Por favor, entre novamente.',
                restore_failed_prefix: 'Falha ao restaurar: ',
                restoring_from_drive: 'Restaurando do Google Drive...',
                deleting_backup_drive: 'Excluindo backup do Google Drive...',
                google_session_expired: 'Sua sessão do Google expirou. Por favor, entre novamente para continuar sincronizando.',
                auto_sync_failed_prefix: 'Falha na sincronização automática: ',
                sync_failed_try_home: 'Algo deu errado na sincronização com o Google Drive. Tente novamente a partir da tela inicial.',
                danger_clear_confirm: 'PERIGO: Isto irá excluir permanentemente todos os dados locais e seu backup no Google Drive. Continuar?',
                all_data_cleared: 'Todos os dados foram removidos com sucesso.',
                failed_to_clear_data: 'Falha ao limpar alguns dados. Verifique o console.',
                syncing_with_drive: 'Sincronizando com o Google Drive...',
                refreshing_session: 'Atualizando sessão...',
                confirm_delete_routine: 'Excluir rotina?',
                delete_routine: 'Deletar rotina',
                missing_routine_name: 'Falta nome ou exercícios na rotina',
                no_exercise_found: 'Nenhum exercício encontrado',
                please_enter_exercise_name: 'Por favor, insira um nome para o exercício.',
                exercise_updated: 'Exercício atualizado!',
                exercise_saved_local: 'Exercício salvo na sua coleção local!',
                failed_to_save_exercise_prefix: 'Falha ao salvar exercício: ',
                you_can_also_clear_local_data: 'Você também pode limpar os dados locais nas configurações se preferir.' ,

                local_mode: 'Modo Local',
                running_local_mode_msg: 'Rodando em modo local.',
                sync_workout_msg: 'Sincronize seus treinos com o Google Drive.',
                language: 'Idioma',
                enter_app: 'Entrar no App',
                connected_to_drive: 'Conectado ao Drive',
                clear_all: 'Limpar Tudo',
                logout: 'Sair',
                not_connected: 'Não Conectado',
                clear_local: 'Limpar Local',
                login: 'Entrar',

                welcome_back_syncing: 'Bem vindo de volta!\nSincronizando seus dados...',
                retry: 'Tentar novamente',
                retrying: 'Tentando...',
                failed_to_refresh_session: 'Não foi possível atualizar sua sessão automaticamente. Por favor, entre novamente.'
                ,
                /* Statistics page */
                workout_frequency: 'Frequência de Treinos',
                monthly: 'Mensal',
                yearly: 'Anual',
                weight_progress: 'Progresso de Peso',
                no_weight_data: 'Sem dados de peso',
                weight_kg: 'Peso (kg)',
                unknown_exercise: 'Exercício Desconhecido',
                current_streak: 'Sequência Atual',
                days: 'Dias',
                start_your_journey: 'Comece sua jornada!',
                best_record: 'Melhor Recorde',
                no_records_yet: 'Nenhum registro ainda',
                keep_it_up: 'Mantenha assim!',
                days_since_last: 'dias desde o último',
                personal_best: 'Recorde Pessoal'
                ,
                /* Exercise types */
                exercise_type_shoulder: 'Ombros',
                exercise_type_chest: 'Peito',
                exercise_type_back: 'Costas',
                exercise_type_legs: 'Pernas',
                exercise_type_arms: 'Braços',
                exercise_type_core: 'Core',
                exercise_type_abs: 'Abdominais',
                exercise_type_cardio: 'Cardio',
                exercise_type_other: 'Outro'
                ,
                /* History page specific keys (unique names) */
                history_header: 'Histórico',
                history_weight_header: 'Histórico de Peso',
                history_workout_header: 'Histórico de Treinos',
                history_no_weight: 'Sem histórico de peso',
                history_no_history: 'Sem dados de histórico',
                history_btn_new_routine: 'Novo Registro de Rotina',
                history_btn_new_weight: 'Novo Registro de Peso',
                history_section_log_routine: 'Registrar Treino',
                history_section_log_weight: 'Registrar Peso',
                history_placeholder_choose_routine: '-- Escolha a Rotina --',
                history_save_session: '💾 Salvar Sessão',
                history_save_weight: '💾 Salvar Peso',
                history_cancel: 'Cancelar',
                history_weight_kg: 'Peso (kg)',
                history_weight_saved: 'Peso salvo!',
                history_sets: 'Séries',
                history_kg: 'Kg',
                history_reps: 'Repetições',
                add_set: 'Adicionar nova série',
                history_delete_session: 'Excluir Sessão',
                history_confirm_delete: 'Excluir todas as entradas para {date}?',
                history_fmt_sets_short: 'sér',
                history_fmt_kg_suffix: 'kg'
                ,
                /* Livesession specific */
                resume_unfinished: '🏃 Sessão incompleta encontrada',
                resume_continue: 'Continuar',
                resume_discard: 'Descartar',
                label_select_routine: 'Selecione uma Rotina',
                choose_routine_placeholder: '-- Escolha a Rotina --',
                start_session: '🚀 Iniciar Sessão',
                play_exercise: '🎯 Executar este exercício',
                finish_routine: '🏁 Finalizar Rotina',
                finished_title: 'Bom trabalho!',
                finished_subtitle: 'Você completou todos os exercícios desta sessão.',
                save_routine_warning: '⚠️ Você alterou alguns valores — devemos também atualizar a rotina ou isso é algo pontual?',
                save_routine_note: 'As estatísticas sempre serão atualizadas',
                save_changes_to_routine: 'Salvar alterações na rotina',
                routine_saved: 'Rotina salva',
                reset_timer: 'Redefinir Temporizador',
                previous_exercise: 'Exercício Anterior',
                next_exercise: 'Próximo Exercício',
                previous_set: 'Série Anterior',
                skip_set: 'Pular Série',
                complete_set: 'Completar Série',
                please_select_exercise: 'Por favor selecione pelo menos um exercício.',
                discard_confirm: 'Descartar rotina incompleta?',
                skip_exercise_confirm: 'Pular o resto deste exercício?',
                new_streak_record: '🎉 NOVO RECORDE DE SEQUÊNCIA: {n} DIAS!',
                debug_error_prefix: 'ERRO DE DEBUG: '
                ,
                drag_to_reorder: 'Arraste para reordenar'
            }
        },
        getLang: function(){
            try {
                // URL override (useful for testing): ?lang=en or ?lang=pt
                try {
                    const params = new URLSearchParams(window.location.search);
                    const q = params.get('lang');
                    if (q) {
                        localStorage.setItem('gn_lang', q);
                        return q;
                    }
                } catch(e) {}

                // Prefer explicit localStorage preference (set by UI) over cookies
                try {
                    const stored = localStorage.getItem('gn_lang');
                    if (stored) return stored;
                } catch(e){}

                // Check cookies for language (some pages store pref in cookies)
                try {
                    const cookieStr = (document && document.cookie) ? document.cookie : '';
                    if (cookieStr) {
                        const match = cookieStr.split(';').map(c => c.trim()).find(c => c.startsWith('gn_lang=') || c.startsWith('lang='));
                        if (match) {
                            const val = match.split('=')[1];
                            if (val) return decodeURIComponent(val);
                        }
                    }
                } catch(e){}
                return (navigator.language || navigator.userLanguage || 'en').toLowerCase().startsWith('pt') ? 'pt' : 'en';
            } catch(e){ return 'en'; }
        },
        setLang: function(lang){
            try { localStorage.setItem('gn_lang', lang); } catch(e){}
            try {
                const d = new Date(); d.setTime(d.getTime() + (365*24*60*60*1000));
                document.cookie = `gn_lang=${encodeURIComponent(lang)};expires=${d.toUTCString()};path=/`;
            } catch(e){}
        },
        t: function(key){
            const lang = this.getLang();
            return (this.translations[lang] && this.translations[lang][key]) || key;
        },
        localizeExerciseType: function(type){
            if (!type) return type;
            try {
                const key = 'exercise_type_' + type.replace(/\s+/g, '_').toLowerCase();
                const translated = this.t(key);
                if (translated && translated !== key) return translated;
            } catch(e){}
            return type;
        },
        // Returns the localized label for a canonical exercise type key (e.g. 'abs', '"legs"')
        getLocalizedTypeLabel: function(type){
            if (!type) return type;
            try {
                const normalized = type.toString().toLowerCase().replace(/\s+/g, '');
                // First try the standard exercise_type_ key
                const key = 'exercise_type_' + normalized;
                const translated = this.t(key);
                if (translated && translated !== key) return translated;

                // Fallback to availableExerciseTypes labels if provided
                const lang = this.getLang();
                const translations = this.translations[lang] || this.translations['en'] || {};
                if (Array.isArray(translations.availableExerciseTypes)){
                    const found = translations.availableExerciseTypes.find(l => l.toString().toLowerCase().replace(/\s+/g,'') === normalized);
                    if (found) return found.toString();
                }
            } catch(e){}
            return type;
        },
        // Returns an array of { key, label } for available exercise types in the current locale
        getAvailableExerciseTypes: function(){
            try {
                const lang = this.getLang();
                const translations = this.translations[lang] || this.translations['en'] || {};
                if (Array.isArray(translations.availableExerciseTypes) && translations.availableExerciseTypes.length > 0) {
                    return translations.availableExerciseTypes.map(l => ({ key: l.toString().toLowerCase().replace(/\s+/g,''), label: l.toString() }));
                }
                // otherwise derive from exercise_type_* keys
                const keys = Object.keys(translations).filter(k => k.indexOf('exercise_type_') === 0);
                return keys.map(k => ({ key: k.replace('exercise_type_', ''), label: translations[k] }));
            } catch(e) { return []; }
        },
        applyTranslations: function(root){
            try{
                root = root || document;
                const nodes = root.querySelectorAll('[data-i18n]');
                nodes.forEach(n => {
                    const key = n.getAttribute('data-i18n');
                    const val = this.t(key);
                    if (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA') {
                        if (n.hasAttribute('placeholder')) n.placeholder = val;
                        else n.value = val;
                    } else {
                        n.textContent = val;
                    }
                });
                // placeholders
                const phs = root.querySelectorAll('[data-i18n-placeholder]');
                phs.forEach(n => {
                    const key = n.getAttribute('data-i18n-placeholder');
                    n.placeholder = this.t(key);
                });
            }catch(e){ console.warn('i18n apply failed', e); }
        }
        ,
        // Safe helper wrappers to avoid repeated defensive checks across files
        safeGetLang: function(){
            try { return this.getLang(); } catch(e){ return 'en'; }
        },
        safeT: function(key){
            try { return this.t(key); } catch(e){ return key; }
        },
        safeApplyTranslations: function(root){
            try { this.applyTranslations(root); } catch(e){}
        }
    };
})();
