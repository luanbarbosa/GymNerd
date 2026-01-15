(function(){
    window.GN_I18N = {
        translations: {
            en: {
                title_main: 'GymNerd',
                sync_pending: '☁️ Sync Pending Changes',
                start_routine: '🚀 Start Routine',
                routines: '🏋 Routines',
                history: '📋 History',
                statistics: '📊 Statistics',
                data_management: '⚙️ Data Management',
                cloud_sync: 'Cloud Sync',
                sync_to_drive: '☁️ Sync to Google Drive',
                restore_from_drive: '📥 Restore from Google Drive',
                backup: 'Backup',
                export_json: '📤 Export 4 JSON Files',
                restore: 'Restore',
                label_images: '1. Images Database (.json)',
                label_exercises: '2. Exercises (.json)',
                label_routines: '3. Routines',
                label_history: '4. History (.json)',
                process_import: '📥 Process Import',
                sign_in_with_google: 'Sign in with Google',

                import_success: 'Import successful!',
                import_error: 'Error importing data. Check console for details.',
                no_backup: 'No backup found on Google Drive.',
                overwrite_confirm: 'This will overwrite all local data with the version from Google Drive. Continue?',
                session_expired: 'Your session has expired. Please login again.',
                restore_failed_prefix: 'Restore failed: ',

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

                welcome_back_syncing: 'Welcome back! Syncing your data...',
                retry: 'Retry',
                retrying: 'Retrying...',
                failed_to_refresh_session: 'Could not refresh your session automatically. Please sign in again.'
            },
            pt: {
                title_main: 'GymNerd',
                sync_pending: '☁️ Alterações pendentes',
                start_routine: '🚀 Iniciar Treino',
                routines: '🏋 Rotinas',
                history: '📋 Histórico',
                statistics: '📊 Estatísticas',
                data_management: '⚙️ Gerenciar Dados',
                cloud_sync: 'Sincronização com a Nuvem',
                sync_to_drive: '☁️ Sincronizar com Google Drive',
                restore_from_drive: '📥 Restaurar do Google Drive',
                backup: 'Backup',
                export_json: '📤 Exportar 4 arquivos JSON',
                restore: 'Restaurar',
                label_images: '1. Banco de Imagens (.json)',
                label_exercises: '2. Exercícios (.json)',
                label_routines: '3. Rotinas',
                label_history: '4. Histórico',
                process_import: '📥 Processar Importação',
                sign_in_with_google: 'Entrar com o Google',

                import_success: 'Importação bem-sucedida!',
                import_error: 'Erro ao importar dados. Verifique o console para detalhes.',
                no_backup: 'Nenhum backup encontrado no Google Drive.',
                overwrite_confirm: 'Isto irá sobrescrever todos os dados locais com a versão do Google Drive. Continuar?',
                session_expired: 'Sua sessão expirou. Por favor, entre novamente.',
                restore_failed_prefix: 'Falha ao restaurar: ',

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

                welcome_back_syncing: 'Bem vindo de volta! Sincronizando seus dados...',
                retry: 'Tentar novamente',
                retrying: 'Tentando...',
                failed_to_refresh_session: 'Não foi possível atualizar sua sessão automaticamente. Por favor, entre novamente.'
            }
        },
        getLang: function(){
            try {
                const stored = localStorage.getItem('gn_lang');
                if (stored) return stored;
                return (navigator.language || navigator.userLanguage || 'en').toLowerCase().startsWith('pt') ? 'pt' : 'en';
            } catch(e){ return 'en'; }
        },
        t: function(key){
            const lang = this.getLang();
            return (this.translations[lang] && this.translations[lang][key]) || key;
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
    };
})();
