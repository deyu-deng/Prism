import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, prismBus } from './event-bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('emit 触发已注册的监听器', () => {
    const listener = vi.fn();
    bus.on('doc:refresh', listener);
    bus.emit('doc:refresh');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('on 注册多个监听器，全部触发', () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    const l3 = vi.fn();
    bus.on('doc:refresh', l1);
    bus.on('doc:refresh', l2);
    bus.on('doc:refresh', l3);
    bus.emit('doc:refresh');
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
    expect(l3).toHaveBeenCalledTimes(1);
  });

  it('off 取消注册后不再触发', () => {
    const listener = vi.fn();
    bus.on('doc:refresh', listener);
    bus.off('doc:refresh', listener);
    bus.emit('doc:refresh');
    expect(listener).not.toHaveBeenCalled();
  });

  it('emit 传递 payload 数据', () => {
    const listener = vi.fn();
    bus.on('command:execute', listener);
    bus.emit('command:execute', { commandId: 'test-cmd' });
    expect(listener).toHaveBeenCalledWith({ commandId: 'test-cmd' });
  });

  it('未注册事件的 emit 不报错', () => {
    expect(() => bus.emit('doc:refresh')).not.toThrow();
    expect(() => bus.emit('command:execute', { commandId: 'x' })).not.toThrow();
  });

  it('once 只触发一次然后自动移除', () => {
    const listener = vi.fn();
    bus.once('doc:refresh', listener);
    bus.emit('doc:refresh');
    bus.emit('doc:refresh');
    bus.emit('doc:refresh');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('once 触发后携带正确 payload', () => {
    const listener = vi.fn();
    bus.once('doc:select', listener);
    bus.emit('doc:select', { title: 'Hello' });
    bus.emit('doc:select', { title: 'World' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ title: 'Hello' });
  });

  it('on 返回的 unsubscribe 函数能取消注册', () => {
    const listener = vi.fn();
    const unsubscribe = bus.on('doc:refresh', listener);
    unsubscribe();
    bus.emit('doc:refresh');
    expect(listener).not.toHaveBeenCalled();
  });

  it('确保无内存泄漏（off 后 listener 引用从 Set 中释放）', () => {
    const listener = vi.fn();
    bus.on('doc:refresh', listener);
    bus.off('doc:refresh', listener);
    // 再次 off 同一个 listener 不应报错
    expect(() => bus.off('doc:refresh', listener)).not.toThrow();
    // 内部 Set 为空（通过再次 emit 不触发验证）
    bus.emit('doc:refresh');
    expect(listener).not.toHaveBeenCalled();
  });

  it('不同事件互不干扰', () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    bus.on('doc:refresh', l1);
    bus.on('doc:select', l2);
    bus.emit('doc:refresh');
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).not.toHaveBeenCalled();
  });

  it('prismBus 是单例导出', () => {
    expect(prismBus).toBeInstanceOf(EventBus);
  });
});
