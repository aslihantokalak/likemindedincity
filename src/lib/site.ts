/** Public GitHub repository URL. Set after the repo is published; links are hidden while empty. */
export const REPO_URL = "https://github.com/aslihantokalak/likemindedincity";

export const sourceLink = (path: string) => (REPO_URL ? `${REPO_URL}/tree/main/${path}` : "");
