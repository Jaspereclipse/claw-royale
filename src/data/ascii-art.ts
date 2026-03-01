import type { HazardType } from '../engine/types.js';

export const TITLE_ART = [
  '   ________    ___ _       __   ____  ____  __  ________    __    ______',
  '  / ____/ /   /   | |     / /  / __ \\/ __ \\/ / / / __/ /   / /   / ____/',
  ' / /   / /   / /| | | /| / /  / /_/ / / / / /_/ / /_/ /   / /   / __/   ',
  '/ /___/ /___/ ___ | |/ |/ /  / _, _/ /_/ / __  / __/ /___/ /___/ /___   ',
  '\\____/_____/_/  |_|__/|__/  /_/ |_|\\____/_/ /_/_/ /_____/_____/_____/   ',
] as const;

export const LOBSTER_ART = [
  '              __     __',
  '             /  \\~~~/  \\',
  '       ,----(     ..    )',
  '      /      \\__     __/',
  '     /|         (\\  |(',
  '    ^ \\   /___\\  /\\ |',
  '       |__|   |__|-" "',
] as const;

export const BOSS_ENCOUNTER_ART = [
  '                           .-"""-.',
  '                         _/  .-.  \\_',
  '               _.---._  (  (o o)  )  _.---._',
  '            .-"  .-.  "-._\\  ^  /_.-"  .-.  "-.',
  "          _/   .'   '.   _.-`---`-._   .'   '.   \\_",
  "        .`   .'  _ _  '.(  .-\"\"\"-.  ).'  _ _  '.   `.",
  "       /   .'   ( V )   \\ /  _ _  \\ /   ( V )   '.   \\",
  '      ;   /      `-`     Y  (o o)  Y     `-`      \\   ;',
  '      |  ;               | \\  ^  / |               ;  |',
  '      ;  |               |  `---`  |               |  ;',
  '       \\ ;               ;         ;               ; //',
  '        `\\             .`         `.             //`',
  '          `-.        .-"  LEVIATHAN  "-.        .-`',
  '             `------`                   `------`',
] as const;

export const HAZARD_WARNING_SYMBOLS: Readonly<Record<HazardType, string>> = {
  vent: '[▲]',
  whirlpool: '[@]',
  current: '[→]',
  'toxic-cloud': '[☁]',
};

export const ENEMY_THUMBNAILS = {
  hermitCrab: [' (\\_/)', '<(o o)>', ' / V \\'],
  seaUrchin: ['  \\|/  ', '-- * --', '  /|\\  '],
  electricEel: [' ~~~~~~', '<=____>', ' ~~~~~~'],
  pufferfish: ['  .-.  ', ' (o o) ', ' /( : )\\'],
  morayEel: ['  ~~~>', ' <~~~ ', '  ~~~>'],
  greatWhiteShark: [' /"*-._', '<_o___)', '  /   '],
} as const;

export const FRAME_CHARS = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|',
  teeLeft: '+',
  teeRight: '+',
  teeTop: '+',
  teeBottom: '+',
  cross: '+',
} as const;
