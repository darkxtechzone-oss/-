# 👑 QUEEN CYNTHIA — WhatsApp Bot

Bot ya WhatsApp iliyojengwa kwa [Baileys](https://github.com/WhiskeySockets/Baileys), yenye:

- 🌐 **Web pairing** — unganisha WhatsApp yako kwa kuandika namba tu, bila QR
- 👥 **Multisession** — hadi watumiaji **3** wanaweza kuunganisha bot kwa wakati mmoja
- 💅 **Ukurasa wa wavuti wa kike/wa kuvutia** wenye leseni ya matumizi (DarkX)
- 🅱️ **Menu yenye fonti nzito (bold)** na picha
- 👀 **Kuona na kupenda status** kiotomatiki

## Muundo wa Faili

```
QueenCynthia/
├── index.js          # kianzio kikuu
├── config.js          # mipangilio yote
├── handler.js         # kisambaza amri
├── helpers.js          # zana za msaada (bold text, owner check, n.k.)
├── sessionManager.js   # usimamizi wa session nyingi (max 3)
├── webserver.js        # seva ya wavuti ya pairing
├── pair.html            # ukurasa wa wavuti wa pairing
├── package.json
├── commands/
│   ├── general.js     # menu, ping, info
│   ├── downloader.js  # yt, tiktok, ig
│   ├── group.js       # kick, promote, demote
│   └── status.js      # autostatus on/off
└── image/
    └── menu.jpg        # picha ya menu
```

## Jinsi ya Kuanzisha

```bash
npm install
npm start
```

Kisha fungua kivinjari: `http://localhost:3000`

1. Andika namba yako ya WhatsApp (pamoja na country code, mfano `255712345678`)
2. Bonyeza **"✨ Pata Pairing Code"**
3. Kwenye simu: WhatsApp → Mipangilio → Vifaa Vilivyounganishwa → Unganisha kifaa → *"Unganisha kwa namba badala yake"* → weka code uliyopewa

Session zinahifadhiwa kwenye folda `session/<namba>/` ili usilazimike ku-pair kila unapowasha bot tena.

## Mipangilio Muhimu (`config.js`)

| Kigezo | Maana |
|---|---|
| `BOT_NAME` | Jina la bot |
| `PREFIX` | Alama ya amri (mfano `.`) |
| `OWNER_NUMBERS` | Namba za owner |
| `MAX_SESSIONS` | Idadi ya watumiaji wanaoruhusiwa kuunganisha kwa wakati mmoja (3) |
| `AUTO_VIEW_STATUS` / `AUTO_LIKE_STATUS` | Kuwasha/kuzima kuona na kupenda status |
| `MENU_IMAGE` | Njia ya picha inayotumika kwenye `.menu` |

## Amri za Bot

- `.menu` — onyesha menu (yenye picha)
- `.ping` — angalia speed
- `.info` — taarifa za bot
- `.yt <link>` — pakua video ya YouTube
- `.tiktok <link>` — pakua video ya TikTok
- `.ig <link>` — pakua kutoka Instagram
- `.kick / .promote / .demote @tag` — usimamizi wa group (admin)
- `.autostatus on/off` — washa/zima kuona na kupenda status (owner)

## Leseni

Software hii inatolewa na **DarkX**. Haturuhusu kunakili, kusambaza au kuuza bila ruhusa rasmi — angalia maandishi madogo chini ya ukurasa wa pairing kwa maelezo kamili.
