/**
 * Template catalog shared between browser editor and local export server.
 * IDs are stable: saved projects may refer to them in the future.
 */
export const TEMPLATES = Object.freeze([
  {id: 'signal', name: 'Signal Lab', category: 'データ', description: 'ピアノロール・FFT・音量の分析UI'},
  {id: 'retro-grid', name: 'Retro Grid', category: 'レトロ', description: 'モノクロの6パネル音楽プレイヤー'},
  {id: 'lofi-player', name: 'After Hours', category: 'ローファイ', description: 'ジャケットと波形の夜景風レイアウト'},
  {id: 'cover-focus', name: 'Cover Flow', category: 'ミニマル', description: 'ジャケットと文字が主役のシンプルな映像'},
  {id: 'dopa-rush', name: 'Dopa Rush', category: 'ショート', description: 'ビート反応・大字幕・高密度の縦型動画'},
]);
export const TEMPLATE_IDS = Object.freeze(TEMPLATES.map(template => template.id));
export function isTemplateId(id) {
  return typeof id === 'string' && TEMPLATE_IDS.includes(id);
}
