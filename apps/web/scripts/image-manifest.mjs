export const APPLE_IMAGE_BASE =
  'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is';

export function appleImageUrl(id) {
  return `${APPLE_IMAGE_BASE}/${id}?wid=1200&hei=1200&fmt=jpeg&qlt=90`;
}

/** Local file key: products/{productId}/{colorSlug}.jpg */
export const imageJobs = [
  // iPhone 16 / 16 Plus / 16 Pro
  job('iphone-16', 'black', ['iphone-16-finish-select-202409-6-1inch-black']),
  job('iphone-16', 'ultramarine', [
    'iphone-16-finish-select-202409-6-1inch-ultramarine',
  ]),
  job('iphone-16', 'teal', ['iphone-16-finish-select-202409-6-1inch-teal']),
  job('iphone-16-plus', 'white', [
    'iphone-16-finish-select-202409-6-7inch-white',
  ]),
  job('iphone-16-plus', 'pink-16', [
    'iphone-16-finish-select-202409-6-7inch-pink',
  ]),
  job('iphone-16-plus', 'ultramarine', [
    'iphone-16-finish-select-202409-6-7inch-ultramarine',
  ]),
  job('iphone-16-pro', 'desert-titanium', [
    'iphone-16-pro-finish-select-202409-6-3inch-deserttitanium',
  ]),
  job('iphone-16-pro', 'black-titanium', [
    'iphone-16-pro-finish-select-202409-6-3inch-blacktitanium',
  ]),
  job('iphone-16-pro', 'natural-titanium', [
    'iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium',
  ]),

  // iPhone 15 family
  job('iphone-15', 'black', ['iphone-15-finish-select-202309-6-1inch-black']),
  job('iphone-15', 'pink-15', ['iphone-15-finish-select-202309-6-1inch-pink']),
  job('iphone-15', 'blue-15', ['iphone-15-finish-select-202309-6-1inch-blue']),
  job('iphone-15-plus', 'green-15', [
    'iphone-15-finish-select-202309-6-7inch-green',
  ]),
  job('iphone-15-plus', 'yellow-15', [
    'iphone-15-finish-select-202309-6-7inch-yellow',
  ]),
  job('iphone-15-plus', 'black', [
    'iphone-15-finish-select-202309-6-7inch-black',
  ]),
  job('iphone-15-pro', 'black-titanium', [
    'iphone-15-pro-finish-select-202309-6-1inch-blacktitanium',
  ]),
  job('iphone-15-pro', 'natural-titanium', [
    'iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium',
  ]),
  job('iphone-15-pro', 'blue-titanium', [
    'iphone-15-pro-finish-select-202309-6-1inch-bluetitanium',
  ]),
  job('iphone-15-pro-max', 'white-titanium', [
    'iphone-15-pro-finish-select-202309-6-7inch-whitetitanium',
  ]),
  job('iphone-15-pro-max', 'black-titanium', [
    'iphone-15-pro-finish-select-202309-6-7inch-blacktitanium',
  ]),
  job('iphone-15-pro-max', 'natural-titanium', [
    'iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium',
  ]),

  // iPhone 14 family
  job('iphone-14', 'midnight', [
    'iphone-14-finish-select-202209-6-1inch-midnight',
  ]),
  job('iphone-14', 'purple', ['iphone-14-finish-select-202209-6-1inch-purple']),
  job('iphone-14', 'yellow', ['iphone-14-finish-select-202209-6-1inch-yellow']),
  job('iphone-14-plus', 'starlight', [
    'iphone-14-finish-select-202209-6-7inch-starlight',
    'iphone-14-plus-finish-select-202209-6-7inch-starlight',
  ]),
  job('iphone-14-plus', 'blue', [
    'iphone-14-finish-select-202209-6-7inch-blue',
    'iphone-14-plus-finish-select-202209-6-7inch-blue',
  ]),
  job('iphone-14-plus', 'product-red', [
    'iphone-14-finish-select-202209-6-7inch-product-red',
    'iphone-14-finish-select-202209-6-7inch-red',
    'iphone-14-plus-finish-select-202209-6-7inch-red',
  ]),
  job('iphone-14-pro', 'space-black', [
    'iphone-14-pro-finish-select-202209-6-1inch-spaceblack',
  ]),
  job('iphone-14-pro', 'deep-purple', [
    'iphone-14-pro-finish-select-202209-6-1inch-deeppurple',
  ]),
  job('iphone-14-pro', 'gold', [
    'iphone-14-pro-finish-select-202209-6-1inch-gold',
  ]),
  job('iphone-14-pro-max', 'space-black', [
    'iphone-14-pro-finish-select-202209-6-7inch-spaceblack',
  ]),
  job('iphone-14-pro-max', 'silver', [
    'iphone-14-pro-finish-select-202209-6-7inch-silver',
  ]),
  job('iphone-14-pro-max', 'deep-purple', [
    'iphone-14-pro-finish-select-202209-6-7inch-deeppurple',
  ]),

  // iPhone 13 family
  job('iphone-13', 'midnight', [
    'iphone-13-finish-select-202207-6-1inch-midnight',
    'iphone-13-select-2021',
  ]),
  job('iphone-13', 'starlight', [
    'iphone-13-finish-select-202207-6-1inch-starlight',
  ]),
  job('iphone-13', 'product-red', [
    'iphone-13-finish-select-202207-6-1inch-red',
    'iphone-13-finish-select-202207-6-1inch-product-red',
  ]),
  job('iphone-13-mini', 'pink', [
    'iphone-13-mini-finish-select-202207-5-4inch-pink',
    'iphone-13-finish-select-202207-5-4inch-pink',
  ]),
  job('iphone-13-mini', 'blue', [
    'iphone-13-mini-finish-select-202207-5-4inch-blue',
    'iphone-13-finish-select-202207-5-4inch-blue',
  ]),
  job('iphone-13-mini', 'midnight', [
    'iphone-13-mini-finish-select-202207-5-4inch-midnight',
    'iphone-13-finish-select-202207-5-4inch-midnight',
  ]),
  job('iphone-13-pro', 'graphite', [
    'iphone-13-pro-finish-select-202207-6-1inch-graphite',
  ]),
  job('iphone-13-pro', 'sierra-blue', [
    'iphone-13-pro-finish-select-202207-6-1inch-sierrablue',
  ]),
  job('iphone-13-pro', 'alpine-green', [
    'iphone-13-pro-finish-select-202203-6-1inch-alpinegreen',
    'iphone-13-pro-finish-select-202207-6-1inch-alpinegreen',
  ]),
  job('iphone-13-pro-max', 'silver', [
    'iphone-13-pro-finish-select-202207-6-7inch-silver',
  ]),
  job('iphone-13-pro-max', 'gold', [
    'iphone-13-pro-finish-select-202207-6-7inch-gold',
  ]),
  job('iphone-13-pro-max', 'sierra-blue', [
    'iphone-13-pro-finish-select-202207-6-7inch-sierrablue',
  ]),

  // AirPods
  job('airpods-4', 'white', [
    'airpods-4-hero-select-202409',
    'airpods-4-select-202409',
  ]),
  job('airpods-pro-2', 'white', ['airpods-pro-2-hero-select-202409']),
  job('airpods-max', 'midnight', ['airpods-max-select-202409-midnight']),
  job('airpods-max', 'starlight', ['airpods-max-select-202409-starlight']),
  job('airpods-max', 'blue', ['airpods-max-select-202409-blue']),
  job('airpods-max', 'orange', ['airpods-max-select-202409-orange']),
  job('airpods-max', 'purple', ['airpods-max-select-202409-purple']),

  // Mac
  job('macbook-air-13', 'midnight', [
    'mba13-midnight-select-202503',
    'macbook-air-m3-13-hero-202402',
    'macbook-air-13-midnight-select-202402',
    'mba13-midnight-select-202206',
  ]),
  job('macbook-air-13', 'starlight', [
    'mba13-starlight-select-202503',
    'macbook-air-13-starlight-select-202402',
    'mba13-starlight-select-202206',
  ]),
  job('macbook-air-13', 'sky-blue', [
    'mba13-skyblue-select-202503',
    'macbook-air-13-skyblue-select-202503',
    'macbook-air-m4-13-skyblue-select-202503',
  ]),
  job('macbook-air-15', 'midnight', [
    'mba15-midnight-select-202503',
    'macbook-air-15-midnight-select-202402',
    'mba15-midnight-select-202306',
  ]),
  job('macbook-air-15', 'starlight', [
    'mba15-starlight-select-202503',
    'macbook-air-15-starlight-select-202402',
  ]),
  job('macbook-air-15', 'sky-blue', [
    'mba15-skyblue-select-202503',
    'macbook-air-15-skyblue-select-202503',
  ]),
  // iPad
  job('ipad-pro', 'space-black', [
    'ipad-pro-finish-select-202405-11inch-spaceblack',
    'ipadpro11-spaceblack-select-202405',
  ]),
  job('ipad-pro', 'silver', [
    'ipad-pro-finish-select-202405-11inch-silver',
    'ipadpro11-silver-select-202405',
  ]),
];

function job(productId, colorSlug, sourceIds) {
  return { productId, colorSlug, sourceIds };
}
