import { computed, effect, inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type * as Phaser from 'phaser';

import { BoardIcons } from '../../@shared/data/board-icons.service';
import { FinaleService } from '../../@shared/data/finale.service';
import { SettingsService } from '../../@shared/data/settings.service';
import { GameClock } from '../../game/data/game-clock.service';
import { GameStore } from '../../game/data/game.store';
import type { SkillLock } from '../../game/model/skill.model';
import {
  SECRET_SKILL_ID,
  SKILL_BY_ID,
  SKILL_HEADING_IDS,
  skillBlurbKey,
  skillLabelKey,
} from '../../game/model/skill.model';
import * as economy from '../../game/util/economy';
import { MODE_FADE_MS } from '../model/board.consts';
import type { SceneDeps } from '../model/scene-deps.model';
import type { SkillNodeView, SkillView } from '../model/skill-view.model';
import { skillEffectText } from '../util/skill-copy';
import type { StageMode } from '../model/stage-mode.model';
import { BoardScene } from '../scene/board-scene';
import { DemoScene } from '../scene/demo-scene';
import { FinaleScene } from '../scene/finale-scene';
import { SkillScene } from '../scene/skill-scene';
import { PhaserService } from './phaser.service';
import { StageModeService } from './stage-mode.service';

interface ModeEntry {
  readonly key: string;
  readonly build: () => Phaser.Scene;
  readonly persistent: boolean;
}

@Injectable({ providedIn: 'root' })
export class StageService {
  #phaser = inject(PhaserService);
  #store = inject(GameStore);
  #clock = inject(GameClock);
  #translate = inject(TranslateService);
  #modes = inject(StageModeService);
  #settings = inject(SettingsService);
  #icons = inject(BoardIcons);
  #finale = inject(FinaleService);

  #showing: StageMode = 'board';
  #switching = false;

  #wanted = computed<StageMode>(() =>
    this.#finale.act() === 'closed' ? this.#modes.mode() : 'finale'
  );

  protected readonly follow = effect(() => {
    const wanted = this.#wanted();
    if (!this.#phaser.initialized()) return;
    this.#showMode(wanted);
  });

  initStage(parent: HTMLElement): void {
    this.#phaser.init(parent);
    this.#modes.request('board');
    this.#showing = 'board';
    this.#enter(this.#entry('board'));
  }

  initDemo(parent: HTMLElement): void {
    this.#phaser.init(parent);
    this.#phaser.game.scene.add(DemoScene.KEY, new DemoScene(), true);
  }

  #showMode(next: StageMode): void {
    if (this.#switching || next === this.#showing) return;

    const leaving = this.#entry(this.#showing);
    const arriving = this.#entry(next);
    this.#switching = true;
    this.#setInputEnabled(leaving.key, false);
    if (next !== 'board') this.#clock.pause('tree');

    void this.#fadeOut(leaving.key).then(() => {
      const scenes = this.#phaser.game.scene;
      if (leaving.persistent) scenes.sleep(leaving.key);
      else scenes.remove(leaving.key);

      this.#showing = next;
      this.#enter(arriving);
      this.#switching = false;
      this.#showMode(this.#wanted());
    });
  }

  resizeStage(width: number, height: number): void {
    this.#phaser.resize(width, height);
  }

  destroyStage(): void {
    this.#phaser.destroy();
    this.#clock.resume('tree');
    this.#modes.request('board');
    this.#showing = 'board';
    this.#switching = false;
  }

  #enter(entry: ModeEntry): void {
    if (entry.key === BoardScene.KEY) this.#clock.resume('tree');
    const scenes = this.#phaser.game.scene;
    if (scenes.getScene(entry.key)) {
      scenes.wake(entry.key);
      scenes.getScene(entry.key)?.cameras.cameras.forEach((cam) => {
        cam.fadeIn(MODE_FADE_MS, 0, 0, 0);
      });
    } else {
      scenes.add(entry.key, entry.build(), true);
    }
    this.#setInputEnabled(entry.key, true);
  }

  #entry(mode: StageMode): ModeEntry {
    switch (mode) {
      case 'board':
        return {
          key: BoardScene.KEY,
          build: () => new BoardScene(this.#deps()),
          persistent: true,
        };
      case 'skills':
        return {
          key: SkillScene.KEY,
          build: () => new SkillScene(this.#deps()),
          persistent: false,
        };
      case 'finale':
        return {
          key: FinaleScene.KEY,
          build: () => new FinaleScene(this.#deps()),
          persistent: false,
        };
    }
  }

  #setInputEnabled(key: string, enabled: boolean): void {
    const scene = this.#phaser.game.scene.getScene(key);
    if (scene?.input) scene.input.enabled = enabled;
  }

  #fadeOut(key: string): Promise<void> {
    const scene = this.#phaser.game.scene.getScene(key);
    if (!scene) return Promise.resolve();
    return new Promise<void>((resolve) => {
      scene.cameras.main.fade(
        MODE_FADE_MS,
        0,
        0,
        0,
        true,
        (_camera: Phaser.Cameras.Scene2D.Camera, at: number) => {
          if (at === 1) resolve();
        }
      );
    });
  }

  #skillView = computed<SkillView>(() => {
    const store = this.#store;
    const translate = this.#translate;
    const nodes: SkillNodeView[] = [];

    for (const node of SKILL_BY_ID.values()) {
      if (node.id === SECRET_SKILL_ID || node.heading === true) continue;
      const rank = store.skillRank(node.id);
      const maxed = rank >= node.levels.length;
      const lock = maxed ? null : store.skillLockReason(node.id);
      nodes.push({
        id: node.id,
        label: translate.instant(skillLabelKey(node.id)),
        blurb: translate.instant(skillBlurbKey(node.id)),
        rank,
        ranks: node.levels.length,
        levels: node.levels.map((level, at) => ({
          label: translate.instant(skillLabelKey(node.id, at + 1)),
          effect: skillEffectText(node, at + 1, (key, params) =>
            translate.instant(key, params)
          ),
          cost: level.cost,
        })),
        cost: maxed ? 0 : store.skillRankCost(node.id),
        maxed,
        available: store.skillAvailable(node.id),
        buyable: !maxed && lock === null,
        status: maxed
          ? translate.instant('skill.status.maxed')
          : lock === null
            ? translate.instant('skill.status.ready')
            : this.#lockText(lock),
      });
    }

    const secret = SKILL_BY_ID.get(SECRET_SKILL_ID);
    return {
      nodes,
      headings: SKILL_HEADING_IDS.map((id) => ({
        id,
        label: translate.instant(skillLabelKey(id)),
      })),
      secret:
        secret && store.skillRank(SECRET_SKILL_ID) > 0
          ? {
              label: translate.instant(skillLabelKey(secret.id)),
              blurb: translate.instant(skillBlurbKey(secret.id)),
            }
          : null,
    };
  });

  #deps(): SceneDeps {
    const store = this.#store;
    const translate = this.#translate;
    const settings = this.#settings;
    return {
      text: (key, params) => translate.instant(key, params),
      board: () => store.board,
      radius: () => store.clickRadius(),
      showClickRing: () => settings.showClickRadius(),
      slots: () => store.sprintSlots(),
      filled: () => store.sprintCount(),
      sprint: () => store.sprint(),
      coaches: () => economy.coachCount(store.state()),
      pizza: () => store.pizzaParty(),
      pending: () => store.sprintValue(),
      tier: () => store.tier(),
      spawnerCount: (adr) => store.spawnerCount(adr),
      managerReach: () => economy.managerReach(store.state()),
      crewCeiling: (crew) => economy.crewCeiling(store.state(), crew),
      hazardNotice: () => store.hazardNotice(),
      seniorPoolSeat: (seat) => store.seniorPoolSeat(seat),
      harvest: (ids: readonly number[]) => store.harvest(ids),
      running: () => store.running(),
      roundLeftMs: () => store.roundLeftMs(),
      haulMs: () => store.haulMs(),
      releasePhases: () => store.releasePhases(),
      buffNotices: () => store.buffNotices(),
      autoClosed: () => store.autoClosed(),
      womanEvery: (crew) => store.womanEvery(crew),
      takePayouts: () => store.takePayouts(),
      takeCloseFloats: () => store.takeCloseFloats(),
      takeWontFix: () => store.takeWontFix(),
      unlockSecret: () => void store.unlockSecret(),
      publishIcons: (icons) => this.#icons.publish(icons),
      skillView: () => this.#skillView(),
      buySkill: (id: string) => store.buySkill(id),
      finaleAct: () => this.#finale.act(),
    };
  }

  #lockText(lock: SkillLock): string {
    const params: Record<string, string | number> = {};
    for (const [name, value] of Object.entries(lock.params ?? {})) {
      const resolve = lock.resolveParams?.includes(name) === true;
      params[name] =
        typeof value === 'number'
          ? value
          : [value]
              .flat()
              .map((key) => (resolve ? this.#translate.instant(key) : key))
              .join(', ');
    }
    return this.#translate.instant(lock.key, params);
  }
}
