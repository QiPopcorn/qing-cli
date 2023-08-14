import { mount } from '@vue/test-utils';
import { describe, expect, it, test } from 'vitest';

import Test from '../Test.vue';

describe('Test.vue', () => {
  it('renders a div', () => {
    const wrapper = mount(Test, {
      props: {
        type: 'primary',
      },
    });
    expect(wrapper.html()).toContain('div');
  });
});
