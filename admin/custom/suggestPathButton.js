/* global window */
function SuggestPathButton({ socket, adapterName, instance, data, onChange }) {
	const React = window.React;
	if (!React) {
		return null;
	}
	const label = data && data._lang === "de" ? "Pfad vorschlagen" : "Suggest path";

	return React.createElement(
		"button",
		{
			style: {
				padding: "6px 16px",
				background: "#1976d2",
				color: "#fff",
				border: "none",
				borderRadius: "4px",
				cursor: "pointer",
				fontSize: "0.875rem",
				fontFamily: "Roboto, Helvetica, Arial, sans-serif",
				fontWeight: 500,
			},
			onClick: function () {
				socket.sendTo(`${adapterName}.${instance}`, "suggestBackupPath", null, function (result) {
					if (result && result.result && onChange && data) {
						var updated = Object.assign({}, data, { backupPath: result.result });
						onChange(updated);
					}
				});
			},
		},
		label,
	);
}

export default SuggestPathButton;
