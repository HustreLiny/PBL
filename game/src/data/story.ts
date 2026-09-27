import type { Item } from '../types';

export type Speaker =
  | '师姐' | '刘主任' | '患者' | '家属' | '护士' | '你' | '血液科' | 'ICU' | '消化科' | '产科' | '风湿免疫科' | '旁白';

export interface Line {
  who: Speaker;
  text: string;
  /** 含信息的对话：特殊背景，可点取收入信息板 */
  item?: Item;
}

/** 横版场景：画面原始高 270 像素、视窗宽 480 像素；人物和物件都站在地面上 */
export const VIEW_W = 480;
export const VIEW_H = 270;
/** 地面所在的纵坐标 */
export const FLOOR = 234;

/** 场景里可交互的人物或物件；x 为中心点的横坐标（原始像素） */
export interface Hotspot {
  id: string;
  /** his：打开 HIS；senior：师姐菜单；person：按 id 找问诊话题；door：去 to 场景；board：假设白板；talk：开始洽谈 */
  kind: 'his' | 'senior' | 'person' | 'door' | 'board' | 'talk';
  label: string;
  x: number;
  /** 离地高度，用于挂在墙上的物件 */
  lift?: number;
  art?: string;
  who?: Speaker;
  to?: string;
}

export interface SceneDef {
  name: string;
  art: string;
  /** 场景总宽（原始像素），大于视窗宽时镜头跟随玩家横向卷动 */
  width: number;
  /** 直接进入场景时玩家的起始位置 */
  spawn: number;
  hotspots: Hotspot[];
}

/** 问诊或查体话题；同一话题最多 3 次 */
export interface Topic {
  id: string;
  /** 所属热点 id */
  person: string;
  label: string;
  lines: Line[];
}

export const MAX_ASK = 3;

export interface TalkOption {
  text: string;
  patient: number;
  clinical: number;
  replies: Line[];
}

export interface TalkNode {
  id: string;
  prompt: Line[];
  options: TalkOption[];
}

export const exhausted = (who: Speaker): Line =>
  who === '患者' || who === '家属'
    ? { who, text: '这个刚才已经说过好几遍了……' }
    : who === '旁白'
      ? { who, text: '刚才已经检查过了，结果记在信息板上。' }
      : { who, text: '我刚才都交代过了，有需要再叫我。' };
