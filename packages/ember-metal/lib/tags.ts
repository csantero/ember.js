import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { backburner } from '@ember/runloop';
import { combine, CONSTANT_TAG, DirtyableTag, Tag, UpdatableTag } from '@glimmer/reference';
import { isProxy } from 'ember-utils';
import { Meta, meta as metaFor } from './meta';

let hasViews = () => false;

export function setHasViews(fn: () => boolean) {
  hasViews = fn;
}

function makeTag() {
  return DirtyableTag.create();
}

export function tagForProperty(object: any, propertyKey: string, _meta?: Meta) {
  if (typeof object !== 'object' || object === null) {
    return CONSTANT_TAG;
  }
  let meta = _meta === undefined ? metaFor(object) : _meta;

  if (isProxy(object)) {
    return tagFor(object, meta);
  }

  let tags = meta.writableTags();
  let tag = tags[propertyKey];
  if (tag) {
    return tag;
  }

  if (EMBER_METAL_TRACKED_PROPERTIES) {
    let pair = combine([makeTag(), UpdatableTag.create(CONSTANT_TAG)]);
    return (tags[propertyKey] = pair);
  } else {
    return (tags[propertyKey] = makeTag());
  }
}

export function tagFor(object: any | null, _meta?: Meta) {
  if (typeof object === 'object' && object !== null) {
    let meta = _meta === undefined ? metaFor(object) : _meta;
    return meta.writableTag(makeTag);
  } else {
    return CONSTANT_TAG;
  }
}

export let dirty: (tag: Tag) => void;
export let update: (outer: Tag, inner: Tag) => void;

if (EMBER_METAL_TRACKED_PROPERTIES) {
  dirty = tag => {
    tag.inner!.first.inner.dirty();
  };

  update = (outer, inner) => {
    outer.inner!.second.inner.update(inner);
  };
} else {
  dirty = tag => {
    tag.inner!.dirty();
  };
}

export function markObjectAsDirty(obj: object, propertyKey: string, meta: Meta) {
  let objectTag = meta.readableTag();

  if (objectTag !== undefined) {
    if (isProxy(obj)) {
      objectTag.inner.first.inner.dirty();
    } else {
      objectTag.inner.dirty();
    }
  }

  let tags = meta.readableTags();
  let propertyTag = tags !== undefined ? tags[propertyKey] : undefined;

  if (propertyTag !== undefined) {
    dirty(propertyTag);
  }

  if (objectTag !== undefined || propertyTag !== undefined) {
    ensureRunloop();
  }
}

function ensureRunloop() {
  if (hasViews()) {
    backburner.ensureInstance();
  }
}
