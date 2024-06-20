/**
 * 调度中心
 */
class Observer {
    constructor() {
        this.observers = [];
    }


    /**
     * 添加观察者
     * @param {*} observer
     */
    addObserver(observer) {
        this.observers.push(observer);
    }

    /**
     * 删除观察者
     * @param {*} observer
     */
    removeObserver(observer) {
        // 删除观察者
        const index = this.observers.indexOf(observer);
        if (index !== -1) {
            this.observers.splice(index, 1);
        }
    }
    /**
     * 通知观察者更新状态
     * @param {any} data
     */
    notifyObserver(data) {
        this.observers.forEach(observer => observer.update(data));
    }
}

/**
 * @classdesc 抽象类，观察者继承此类，申明update方法
 */
class Subject {
    /**
     * 观察者更新状态
     * @param {any} data
     */
    update() {}
}

export { Observer, Subject };
