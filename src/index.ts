import { bootstrapApp } from "./core/bootstrap";

void bootstrapApp().catch((error) => {
	console.error("Error al iniciar el bot", error);
	process.exit(1);
});
