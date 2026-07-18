/* Custom jsonConfig component: test local backup path */
const React = window.React;
const { useState } = React;

const LABELS = {
    de: 'Pfad testen (vorher speichern)',
    en: 'Test path (save first)',
    ru: 'Проверить путь (сначала сохранить)',
    pt: 'Testar caminho (guardar primeiro)',
    nl: 'Pad testen (eerst opslaan)',
    fr: "Tester le chemin (enregistrer d'abord)",
    it: 'Testa percorso (salva prima)',
    es: 'Probar ruta (guardar primero)',
    pl: 'Testuj ścieżkę (najpierw zapisz)',
    uk: 'Перевірити шлях (спочатку зберегти)',
    'zh-cn': '测试路径（请先保存）',
};

function TestPathButton({ socket, adapterName, instance, alive, themeType, systemConfig }) {
    const [open, setOpen] = useState(false);
    const [msg, setMsg] = useState('');

    function handleClick() {
        socket.sendTo(`${adapterName}.${instance}`, 'testLocalPath', null, function (result) {
            const text =
                typeof result === 'string' ? result
                : result && result.error ? result.error
                : result && result.result ? result.result
                : '';
            setMsg(text);
            setOpen(true);
        });
    }

    const lang = (systemConfig && systemConfig.common && systemConfig.common.language) || 'en';
    const label = LABELS[lang] || LABELS.en;
    const dark = themeType === 'dark';
    const disabled = alive === false;
    const h = React.createElement;

    return h('div', { style: { width: '100%', padding: '4px 0' } },
        h('button', {
            onClick: handleClick,
            disabled: disabled,
            style: {
                padding: '6px 16px',
                background: disabled ? '#9e9e9e' : '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
                fontWeight: 500,
                letterSpacing: '0.02857em',
                textTransform: 'uppercase',
                lineHeight: 1.75,
                opacity: disabled ? 0.6 : 1,
            },
        }, label),
        open && h('div', {
            style: {
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
            },
            onClick: function () { setOpen(false); },
        },
            h('div', {
                role: 'dialog',
                style: {
                    background: dark ? '#424242' : '#fff',
                    color: dark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)',
                    padding: '20px 24px 12px',
                    borderRadius: '4px',
                    minWidth: '280px',
                    maxWidth: '440px',
                    width: '90%',
                    boxShadow: '0 11px 15px -7px rgba(0,0,0,.2),0 24px 38px 3px rgba(0,0,0,.14),0 9px 46px 8px rgba(0,0,0,.12)',
                },
                onClick: function (e) { e.stopPropagation(); },
            },
                h('p', { style: { margin: '0 0 20px', fontSize: '1rem', lineHeight: 1.5 } }, msg),
                h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                    h('button', {
                        onClick: function () { setOpen(false); },
                        style: {
                            padding: '6px 16px',
                            background: 'transparent',
                            color: '#1976d2',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
                            fontWeight: 500,
                            letterSpacing: '0.02857em',
                            textTransform: 'uppercase',
                        },
                    }, 'OK')
                )
            )
        )
    );
}

export default TestPathButton;
