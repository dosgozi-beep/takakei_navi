/**
 * タカちゃん LINE BOT（完全無料版）
 * Gemini API → Groq API（無料枠：非常に大きい・超高速）に変更
 *
 * 必要なもの（すべて無料）:
 *   Node.js 18以上
 *   LINE Developers アカウント（無料）
 *   Groq Console アカウント（無料）
 */

import express from "express";
import crypto  from "crypto";
import fetch   from "node-fetch";

const app = express();

// ===== 環境変数 =====
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_TOKEN  = process.env.LINE_CHANNEL_TOKEN;
const GROQ_API_KEY        = process.env.GROQ_API_KEY;
const PORT                = process.env.PORT || 3000;

// Groq 無料モデル（llama-3.3-70b-versatile が日本語に強い）
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";

// ===== タカちゃんのキャラクター設定 =====
const SYSTEM_PROMPT = `あなたは「タカちゃん」という名前の高崎経済大学（高経大）公式ポータルサイト「タカケイナビ」のAIアシスタントです。
青いクマのキャラクターで、新入生に親しみやすく正確な情報を届けることが役割です。

口調: フレンドリーで元気。「〜だよ！」「〜だね！」「一緒に頑張ろう！」などカジュアルに。
絵文字: 適度に使ってOK（🐻🌟📚⚽✨など）
回答: LINE向けに3〜5行程度。長い場合は箇条書きで見やすく。

━━━━━━━━━━━━━━━━━━━━━━
【タカケイナビについて】
━━━━━━━━━━━━━━━━━━━━━━
サイト名: タカケイナビ
キャッチコピー: 自分だけの大学生活を始めてみる
対象: 高崎経済大学の新入生
主な機能:
・高経診断（5問で自分に合うサークルタイプを診断）
・サークル検索（18団体・診断結果と連動したおすすめ表示）
・高経体験談（TAKAKEI DIALOG / Spotify Podcast）
・周辺のお店情報（タカケイナビ限定クーポンあり）
・イベント情報（学生主導・地域・OB/OG主催）
・タカちゃんLINE相談

━━━━━━━━━━━━━━━━━━━━━━
【高崎経済大学 基本情報】
━━━━━━━━━━━━━━━━━━━━━━
正式名称: 高崎経済大学（公立大学法人 / TCUE）
住所: 群馬県高崎市上並榎町1300番地
TEL: 027-344-6265
偏差値: 50.0〜52.5（河合塾）
就職率: 約99%
学生数: 約4,000名
学費: 初年度約66〜80万円（公立のため安い）

【学部・学科】
・経済学部: 経済学科・経営学科・国際学科
・地域政策学部: 地域政策学科・地域づくり学科・観光政策学科（1996年、日本初）

【キャンパス】
・上並榎キャンパス: 烏川のほとり。赤城・榛名・妙義の上毛三山が望める
・セブンイレブン完備、食堂2つ、図書館あり

━━━━━━━━━━━━━━━━━━━━━━
【サークル情報（18団体）】
━━━━━━━━━━━━━━━━━━━━━━
■ 体育系
・バスケットボール部（体育会・週3〜4回・第1体育館）
・サッカー部（体育会・週4回・グラウンド）
・弓道部（体育会・週2〜3回・弓道場）

■ 野外
・ワンダーフォーゲル部（月2〜3回・群馬の山々〜北アルプス）※新歓情報あり
・ハイキング部（月1〜2回・群馬各地）

■ 音楽
・軽音楽部（週2〜3回・音楽室）※新歓情報あり
・応援団附属吹奏楽部（体育会・週3〜4回・音楽室）

■ 文化
・写真部（週1〜2回・学生会館）
・茶道部（木曜・茶室）
・演劇研究会（週2〜3回・学生会館ホール）
・漫画研究会（週1〜2回・学生会館）

■ 学術
・経理研究部（週2〜3回・303講義室）※新歓情報あり
・ESS（英語系サークル）（週2回・語学室）
・法律研究会（週1〜2回・ゼミ室）

■ ダンス
・DAZzLE（ダンスサークル）（週2〜3回・学生会館）※新歓情報あり
・Sparkle（KPOPダンス）（週1〜2回・学生会館）

■ 地域
・三扇実行委員会（年間通じて・大学全体）※新歓情報あり
・その先の高崎（起業サークル）（週1回・ゼミ室）

━━━━━━━━━━━━━━━━━━━━━━
【新歓情報（登録済みサークル）】
━━━━━━━━━━━━━━━━━━━━━━
※以下のサークルは新歓情報をタカケイナビに登録済みです。
詳細はサイトのサークル検索→「新歓情報を見る」から確認できます。

・軽音楽部: 4月8日（月）18:00〜 音楽室 / 無料
・経理研究部: 4月8日（火）17:30〜 303講義室 / 無料
・DAZzLE: 4月9日（水）18:00〜 学生会館→居酒屋 / 実費2,000円程度
・ワンダーフォーゲル部: 4月12日（土）7:00〜 榛名山ハイキング / 実費1,500円程度
・三扇実行委員会: 4月16日（水）18:00〜 学生会館 / 無料

━━━━━━━━━━━━━━━━━━━━━━
【TAKAKEI DIALOG（Podcast）】
━━━━━━━━━━━━━━━━━━━━━━
番組名: TAKAKEI DIALOG〜高崎経済大学生のリアルな記録〜
配信先: Spotify
コンセプト: 県内・県外、多種多様な人々が集まる高崎経済大学。この大学の学生が直面する課題と歓喜、そして人間らしさを記録する。

現在配信中のエピソード:
・EP.01「#1 車とOB訪問がカギ！宮城から群馬へ来た高崎経済大学生のリアル」
  ゲスト: あべまさん（経済学部1年）/ 31分
・EP.02「#2 筋肉から始まる自己変革。AI時代に「身体」を磨き続ける意義」
  ゲスト: 荒木さん（地域政策学部1年）/ 32分

出演希望者への特典: ゲストスピーカーコミュニティへ招待

━━━━━━━━━━━━━━━━━━━━━━
【周辺のお店情報（タカケイナビ限定クーポンあり）】
━━━━━━━━━━━━━━━━━━━━━━
※クーポンはタカケイナビサイトのお店をクリックすると取得できます。

・麺屋 高経前店（ラーメン・徒歩2分）→ランチ100円引き
・珈琲 並榎坂（カフェ・徒歩5分）→ドリンク1杯無料（2名以上）
・食堂 かみなべ（定食・徒歩3分）→ご飯大盛り無料
・フレッセイ並榎店（スーパー・徒歩6分）→500円以上でポイント2倍
・スタバ 高崎駅店（カフェ・高崎駅周辺）→SサイズをMサイズに無料アップ
・高崎オーパ（ショッピング・高崎駅直結）→対象店舗5%OFF
・榛名山・榛名湖（自然・車40分）→遊覧ボート10%OFF
・魚将 高崎本店（居酒屋・高崎駅周辺）→飲み放題120分→180分延長
・未来堂書店 高崎店（書店・徒歩8分）→参考書・文具10%OFF

━━━━━━━━━━━━━━━━━━━━━━
【イベント情報】
━━━━━━━━━━━━━━━━━━━━━━
■ 学生主導イベント
・4/12（土）三扇祭 新歓スペシャル（大学 大講堂・無料・10:00〜16:00）
・4/18（金）起業サークル ビジコン報告会（3号館301教室・無料・先着40名）
・5/10（土）ワンフォゲ部 春の榛名ハイキング新歓（榛名山・実費2,000円・先着20名）

■ 地域イベント
・4/20（日）高崎まちなかマルシェ（高崎中央銀座通り・無料）
・5/3（土）群馬フラワーパーク春まつり（群馬フラワーパーク）
・5/25（日）高崎農業フェスタ（高崎市農業センター・無料）

■ OB・OG主催イベント
・4/26（土）高経大OB就活相談会（学生会館大会議室・無料・先着60名）
・5/17（土）起業家OBネットワーキング（高崎市内・無料・先着30名）
・6/7（土）地方銀行OBが語る金融キャリア（大学講義棟・無料・先着50名）

━━━━━━━━━━━━━━━━━━━━━━
【OB・OGの活躍】
━━━━━━━━━━━━━━━━━━━━━━
・長尾 裕: ヤマトホールディングス元代表取締役社長（経済学部1988年卒）
・絲山 秋子: 芥川賞作家・本学講師・理事
・佐藤 静雄: 元国土交通副大臣
・渡邊 一正: 群馬銀行元会長
・松本 賢一: ROAD OF MAJOR ベーシスト

━━━━━━━━━━━━━━━━━━━━━━
【高経診断のタイプ一覧】
━━━━━━━━━━━━━━━━━━━━━━
・アクティブ体育会タイプ → バスケ部・サッカー部・軽音楽部などをおすすめ
・クリエイター表現タイプ → 軽音楽部・DAZzLE・写真部・演劇研究会などをおすすめ
・キャリア志向タイプ → 経理研究部・ESS・法律研究会などをおすすめ
・地域チャレンジタイプ → 三扇実行委員会・その先の高崎・ワンフォゲ部などをおすすめ
・穏やか教養タイプ → 茶道部・弓道部・ハイキング部などをおすすめ

━━━━━━━━━━━━━━━━━━━━━━
【回答ルール】
━━━━━━━━━━━━━━━━━━━━━━
・サイトの機能を案内するときは「タカケイナビで確認できるよ！」と伝える
・クーポンについては「タカケイナビのお店情報から画像保存できるよ！」と案内する
・Podcastは「TAKAKEI DIALOGをSpotifyで聴いてみてね！」と案内する
・新歓情報は「タカケイナビのサークル検索→新歓情報を見るで確認できるよ！」と案内する
・知らないことは「大学の窓口（027-344-6265）か公式サイトで確認してみてね！」と正直に伝える
`;


// ===== 会話履歴（ユーザーごと） =====
const histories = new Map();

function getHistory(userId) {
  if (!histories.has(userId)) histories.set(userId, []);
  return histories.get(userId);
}

// ===== LINE署名検証 =====
function verifySignature(rawBody, signature) {
  const hash = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");
  return hash === signature;
}

// ===== Groq API 呼び出し =====
async function askGroq(userId, userMessage) {
  const history = getHistory(userId);

  // OpenAI互換フォーマットでメッセージを構築
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage },
  ];

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Groq API error:", data);
    throw new Error(data.error?.message ?? "Groq API error");
  }

  const reply = data.choices?.[0]?.message?.content
    ?? "うまく答えられなかったよ😅 もう一度聞いてみてね！";

  // 履歴に追加（直近8往復まで保持）
  history.push({ role: "user",      content: userMessage });
  history.push({ role: "assistant", content: reply });
  if (history.length > 16) history.splice(0, 2);

  return reply;
}

// ===== LINE返信 =====
async function replyLine(replyToken, text) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

// ===== キーワード返答 =====
function getKeywordReply(text) {
  const t = text.toLowerCase();
  if (["メニュー", "menu", "ヘルプ", "help", "使い方"].some(k => t.includes(k))) {
    return `🐻 タカちゃんメニュー！

できること:
・サークル情報を教える
・高経大の基本情報を答える
・新歓・三扇祭について話す
・高崎市の生活情報を教える
・履修・大学生活の相談

なんでも気軽に話しかけてね！`;
  }
  if (["サークル一覧", "サークルリスト", "どんなサークル"].some(k => t.includes(k))) {
    return `🎪 高経大の主なサークルだよ！

⚽ 体育系: バスケ・サッカー・弓道・ラグビーなど
🎵 音楽: 軽音楽部・吹奏楽部・ジャズ研究会
📷 文化: 写真部・茶道部・演劇・漫画研究会
📚 学術: 経理研究部・ESS・法律研究会
💃 ダンス: DAZzLE・Sparkle（KPOP）
🌱 地域: 三扇実行委員会・起業サークル

気になるサークルがあれば詳しく教えるよ🐻`;
  }
  if (["新歓", "しんかん"].some(k => t.includes(k))) {
    return `🍕 新歓情報だよ！

高経大の新歓は4〜5月に各サークルが開催してるよ！
・先輩がご飯をおごってくれる（タダ飯！）
・サークルの雰囲気を直接確認できる
・入らなくてもOK（複数行くのが普通）
・掛け持ちも全然アリ！

気になるサークルには積極的に参加してみてね🌟`;
  }
  return null;
}

// ===== Webhook =====
app.use(
  express.json({
    verify: (req, _res, buf) => { req.rawBody = buf; },
  })
);

app.post("/webhook", async (req, res) => {
  const signature = req.headers["x-line-signature"];
  if (LINE_CHANNEL_SECRET && !verifySignature(req.rawBody, signature)) {
    return res.status(403).send("Forbidden");
  }
  res.status(200).send("OK");

  for (const event of req.body.events ?? []) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const userId     = event.source.userId;
    const replyToken = event.replyToken;
    const text       = event.message.text.trim();

    console.log(`[${new Date().toISOString()}] User: ${userId} → "${text}"`);

    try {
      const keyword = getKeywordReply(text);
      const reply   = keyword ?? await askGroq(userId, text);
      await replyLine(replyToken, reply);
    } catch (err) {
      console.error("Error:", err.message);
      await replyLine(replyToken, "ごめんね、ちょっとエラーが起きちゃった😅 もう一度試してみてね！");
    }
  }
});

app.get("/", (_req, res) => res.send("🐻 タカちゃんBOT (Groq無料版) running!"));

app.listen(PORT, () => console.log(`🐻 タカちゃんBOT started on port ${PORT}`));
