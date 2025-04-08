import localstorage from './localstorage'
export { localstorage }
/**
 * 是否是 json 字符串
 * @param {*} str
 */
export const isJSON = (str: unknown) => {
	if (typeof str === 'string') {
		try {
			const obj = JSON.parse(str);
			if (typeof obj === 'object' && obj) {
				return true;
			} else {
				return false;
			}
		} catch (e) {
			return false;
		}
	}
};

/**
 * 深度克隆
 * @param param
 * @returns {{}|*}
 */
export const deepClone = (param: any) => {
	const type = (t: any) => Object.prototype.toString.call(t);
	if (type(param) === '[object Object]') {
		const copy: any = {};
		Object.keys(param).forEach((key) => {
			if (Object.prototype.hasOwnProperty.call(param, key)) {
				if (type(param[key]) === '[object Object]' || type(param[key]) === '[object Array]') {
					copy[key] = deepClone(param[key]);
				} else {
					copy[key] = param[key];
				}
			}
		});
		return copy;
	} else if (type(param) === '[object Array]') {
		return param.map((item: any) => deepClone(item));
	} else {
		return param;
	}
};

/**
 * 校验是否有权限
 * @param {string|Array|function} rule 权限
 * @param {Array} allRules 用户权限集合
 * @returns {boolean} 是否有权限
 */
export const defendAuth = (rule: any, allRules: any) => {
	if (typeof rule === 'string') {
		// 优先检查权限是否字符串
		return allRules.indexOf(rule) > -1;
	}
	if (Array.isArray(rule)) {
		// 支持权限为数组形式
		return rule.some((anyRule) => allRules.indexOf(anyRule) > -1);
	}
	if (typeof rule === 'function') {
		// 支持权限为方法形式，接收Boolean类型的返回值
		return !!rule(allRules);
	}
	return false;
};

/**
 *
 * @param time
 * @param format 格式化
 * @returns
 */
export const formatDate = (time, format = 'YY-MM-DD hh:mm:ss') => {
	var date = new Date(time);

	var year:number  = date.getFullYear(),
		month = date.getMonth() + 1, //月份是从0开始的
		day = date.getDate(),
		hour = date.getHours(),
		min = date.getMinutes(),
		sec = date.getSeconds();
	var preArr = Array.apply(null, Array(10)).map(function(elem, index) {
		return '0' + index;
	});

	var newTime = format
		.replace(/YY/g, `${year}`)
		.replace(/MM/g, `${preArr[month] || month}`)
		.replace(/DD/g, `${preArr[day] || day}`)
		.replace(/hh/g, `${preArr[hour] || hour}`)
		.replace(/mm/g, `${preArr[min] || min}`)
		.replace(/ss/g, `${preArr[sec] || sec}`);

	return newTime;
};
