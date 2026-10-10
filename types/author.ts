/** A local author photo with its intrinsic size and blur preview (read on the server). */
export type AuthorAvatar = {
  src: string;
  width: number;
  height: number;
  blurDataURL: string;
};
