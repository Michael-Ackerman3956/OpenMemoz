export interface Story {
  storyIdentifier: string;
  headline: string;
  excerpt: string;
  section: string;
  provenanceTier: 1 | 2;
  sourceName: string;
  sourceUrl: string;
  licenceBasis: string;
  citations?: string[];
  publishedAt: string;
  fetchedAt: string;
  imageUrl?: string;
  youtubeVideoId?: string;
  isFavourite?: boolean;
  isHeroPinned?: boolean;
}

export interface Edition {
  editionDate: string;
  editionNumber: number;
  generatedAt: string;
  storyCount: number;
  sections: string[];
  stories: Story[];
}
