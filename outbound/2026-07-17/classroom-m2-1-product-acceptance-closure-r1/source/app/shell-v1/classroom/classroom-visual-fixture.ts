export const colorGradientVisualAssets = {
  cover: "/classroom/color-gradient-r1-3/natural-mountain-sunset-cc0.jpg",
  naturalMoment: "/classroom/color-gradient-r1-3/natural-mountain-sunset-cc0.jpg",
  duskSky: "/classroom/color-gradient-r1-3/natural-sky-dusk-public-domain.jpg",
  gradientCharm: "/classroom/color-gradient-r1-3/natural-aurora-public-domain.jpg",
} as const;

export const colorGradientPreflightScreenIds = [
  "S01",
  "S02",
  "S05",
  "S06",
  "S09",
] as const;

export const colorGradientScreenPresentation: Record<
  string,
  {
    imageUri?: string;
    title?: string;
    question?: string;
    studentAction?: string;
  }
> = {
  S01: {
    imageUri: colorGradientVisualAssets.naturalMoment,
    title: "先感受天空的颜色",
    question: "你觉得这像一天中的什么时候？哪一处颜色最先吸引你？",
    studentAction: "先安静看一会儿，再说说你的感受。",
  },
  S02: {
    imageUri: colorGradientVisualAssets.duskSky,
    title: "颜色在慢慢变化",
    question: "从地平线到天空，颜色是怎样一点点变过去的？",
    studentAction: "用手指沿着颜色变化的方向找一找。",
  },
  S05: {
    imageUri: colorGradientVisualAssets.gradientCharm,
    title: "渐变的魅力",
    question: "这片天空的颜色变化，带给你怎样的感受？",
    studentAction: "找出最有变化的一段颜色，说说它为什么打动你。",
  },
};
