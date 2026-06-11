export class QuickJumpManager {
    constructor({ jumpAdapter = null } = {}) {
        this.jumpAdapter = jumpAdapter;
    }

    async resolve(query, context = {}) {
        if (typeof this.jumpAdapter?.resolve === 'function') {
            return this.jumpAdapter.resolve(query, context);
        }

        return null;
    }

    buildRouteAction(route) {
        return route ? { route, action: 'open_route' } : null;
    }

    buildElementAction(route, element) {
        return route && element ? { route, element, action: 'focus_element' } : null;
    }

    destroy() {
        this.jumpAdapter = null;
    }
}
