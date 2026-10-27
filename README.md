# WhatsUpPlant 🌿 — Application Web & PWA de Gestion de Plantes par IA

Application complète de gestion de plantes d'intérieur avec :
- **Rappels d'arrosage intelligents** & validation d'arrosage en 1 clic (avec notifications Web / PWA)
- **Création de profil plante** (surnom, photo caméra/upload, pièce, besoins en lumière et humidité)
- **Identification automatique de l'espèce par IA** (Google Gemini Vision) à partir d'une photo
- **Diagnostic d'état de santé & soin des maladies par IA** (détection des parasites/maladies/stress hydrique + protocole de soin étape par étape)
- **Interface Web & Mobile PWA** installable sur iOS et Android

---

## Démarrage rapide

### 1. Installer les dépendances & initialiser la base SQLite

```bash
npm install
npx prisma db push
```

### 2. Configurer la clé Google Gemini API (Optionnel pour démarrer)

Dans le fichier `.env` à la racine du projet :

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="whatsupplant-super-secret-jwt-key-change-in-prod-2026"
GEMINI_API_KEY="votre_cle_gemini_ici"
```

> **Note** : Si `GEMINI_API_KEY` est laissé vide, l'application fonctionne automatiquement en **mode simulation botanique intelligent**, ce qui permet de tester immédiatement l'identification d'espèce et le diagnostic de maladies sans clé API.

### 3. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000).
Créez un compte sur `/register` (vous pouvez cocher l'option pour pré-remplir 2 plantes d'exemple dès l'inscription).
