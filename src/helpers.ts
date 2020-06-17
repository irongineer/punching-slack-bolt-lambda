// helper to generate a URL with query parameters
function getUrlWithParams(url: string, params: { [x: string]: string }) {
  if (url.indexOf('?') < 0) url += '?';
  url += Object.keys(params)
    .map(key => key + '=' + params[key])
    .join('&');
  return url;
}

// deep copy a message
function copy(message: any) {
  return JSON.parse(JSON.stringify(message));
}

function hasProperty<K extends string>(x: unknown, name: K): x is { [M in K]: unknown } {
  return x instanceof Object && name in x;
}

export { copy, getUrlWithParams, hasProperty };
