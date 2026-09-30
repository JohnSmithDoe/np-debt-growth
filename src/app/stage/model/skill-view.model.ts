export interface SkillLevelView {
  readonly label: string;
  readonly effect: string;
  readonly cost: number;
}

export interface SkillNodeView {
  readonly id: string;
  readonly label: string;
  readonly blurb: string;
  readonly rank: number;
  readonly ranks: number;
  readonly levels: readonly SkillLevelView[];
  readonly cost: number;
  readonly maxed: boolean;
  readonly available: boolean;
  readonly buyable: boolean;
  readonly credit: boolean;
  readonly status: string;
}

export interface SkillHeadingView {
  readonly id: string;
  readonly label: string;
}

export interface SkillView {
  readonly nodes: readonly SkillNodeView[];
  readonly headings: readonly SkillHeadingView[];
  readonly secret: { readonly label: string; readonly blurb: string } | null;
}
