function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function getSegment(segments, segmentId) {
	var segment = $.grep(segments, function(item, index) {
		return item.id == segmentId;
	});
	
	return segment[0];
}

ko.bindingHandlers.secondsAsTime = {
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var value = ko.unwrap(valueAccessor());

        if (value == null) {
            $(element).text('');
            return;
        }

        var date = new Date(null);
        date.setSeconds(value);
        $(element).text(date.toISOString().substr(14, 5));
    }
};

ko.bindingHandlers.formattedDate = {
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var value = ko.unwrap(valueAccessor());

        if (value == null) {
            $(element).text('');
            return;
        }

        $(element).text(new Date(value).toLocaleDateString('en-GB', {  
            day : 'numeric',
            month : 'short',
            year : 'numeric'
        }));
    }
};

var SegmentViewModel = function (id, name, length, grade, jersey) {
    var self = this;
	
	self.id = id;
	self.name = name;
	self.length = length;
	self.grade = grade;
	self.jersey = jersey;
	self.time = ko.observable(null);
	self.date = ko.observable(null);
	self.effortId = ko.observable(null);
	self.bestTime = ko.observable(null);
	self.bestDate = ko.observable(null);
	self.bestEffortId = ko.observable(null);
	self.rank = ko.observable(null);
	self.percentile = ko.observable(null);
	self.thirtyDayBestTime = ko.observable(null);
	self.thirtyDayBestDate = ko.observable(null);
	self.thirtyDayBestEffortId = ko.observable(null);

	self.getEffortUrl = function (effortId) {
	    var id = ko.unwrap(effortId);

	    if (id == null) {
	        return null;
	    }
	    return 'https://www.strava.com/segment_efforts/' + id.toString();
	};

	self.formattedRank = ko.computed(function() {
	    if (self.rank() == null) {
	        return '';
	    }
	    return self.rank().toLocaleString();
	});

	self.url = ko.computed(function () {
	    return 'https://www.strava.com/segments/' + id.toString();
	});

	self.effortUrl = ko.computed(function () {
	    return self.getEffortUrl(self.effortId());
	});

	self.bestEffortUrl = ko.computed(function () {
	    return self.getEffortUrl(self.bestEffortId());
	});

	self.thirtyDayBestEffortUrl = ko.computed(function () {
	    return self.getEffortUrl(self.thirtyDayBestEffortId());
	});
}

$(document).ready(function(){
	var accessToken = getParameterByName("accessToken");
	var athleteId = getParameterByName("athleteId");
	var segments = [
		new SegmentViewModel(12109030, 'Hilly KOM Forward', 0.5, 6, 'red-polka-dot-jersey'),
		new SegmentViewModel(12128029, 'Hilly KOM Reverse', 1.5, 2, 'red-polka-dot-jersey'),
		new SegmentViewModel(11596903, 'Epic KOM Forward', 5.8, 4, 'blue-polka-dot-jersey'),
		new SegmentViewModel(11596925, 'Epic KOM Reverse', 3.8, 6, 'blue-polka-dot-jersey'),
		new SegmentViewModel(12109305, 'Sprint Forward', 0.2, 0, 'green-jersey'),
		new SegmentViewModel(12109228, 'Sprint Reverse', 0.1, 0, 'green-jersey'),
		new SegmentViewModel(12128826, 'Libby Hill KOM', 0.3, 6, 'red-polka-dot-jersey'),
		new SegmentViewModel(12128917, '23rd St KOM', 0.1, 10),
		new SegmentViewModel(12128762, 'Monument Ave Sprint', 0.1, 0, 'green-jersey'),
		new SegmentViewModel(12128880, 'Broad St Sprint', 0.1, 0),
		new SegmentViewModel(12744502, 'Box Hill KOM', 1.8, 4, 'red-polka-dot-jersey'),
		new SegmentViewModel(12744396, 'Fox Hill KOM', 1.9, 4, 'red-polka-dot-jersey'),
		new SegmentViewModel(12749377, 'The Mall Sprint Forward', 0.1, -1, 'green-jersey'),
		new SegmentViewModel(12749402, 'The Mall Sprint Reverse', 0.1, 1, 'green-jersey')
	];
	
	// Orange
	// F and R hilly lap Watopia
	// F London loop (bug with R)
	// F UCI Richmond (not sure about R)
	
	var viewModel = { efforts: ko.observableArray(segments), lastSort: '' };
	
	viewModel.sort = function (propertyName) {
	    var modifier = viewModel.lastSort == propertyName ? -1 : 1;

	    viewModel.efforts.sort(function (left, right) {
	        var leftValue = ko.unwrap(left[propertyName]);
	        var rightValue = ko.unwrap(right[propertyName]);

	        if (leftValue == rightValue)
	            return 0;
	        if (leftValue < rightValue)
	            return -1 * modifier;
	        else
	            return 1 * modifier;
	    });

	    viewModel.lastSort = viewModel.lastSort == propertyName ? '' : propertyName;
	}

	ko.applyBindings(viewModel);
	
	for (var i = 0; i < segments.length; i++) {
		$.ajax({
			url: 'https://www.strava.com/api/v3/segments/' + segments[i].id.toString() + '/leaderboard?page=1&per_page=1',
			headers: {
				'Authorization': 'Bearer ' + accessToken,
				'Content-Type': 'application/json'
			},
			method: 'GET',
			dataType: 'json',
			segmentId: segments[i].id,
			success: function(data){
				var segment = getSegment(segments, this.segmentId);
				var athleteBest = $.grep(data.entries, function(item, index) {
					return item.athlete_id == athleteId;
				});
				var overallBest = data.entries[0];
				
				if (athleteBest.length == 1) {
					segment.time(athleteBest[0].moving_time);
					segment.date(athleteBest[0].start_date);
					segment.rank(athleteBest[0].rank);
					segment.percentile(Math.ceil(athleteBest[0].rank / data.effort_count * 100.0)); // TODO Round up, i.e. 3.1 => 4.
					segment.effortId(athleteBest[0].effort_id);
				}
				segment.bestTime(overallBest.moving_time);
				segment.bestDate(overallBest.start_date);
				segment.bestEffortId(overallBest.effort_id);
			}
		});
		
		var startDate = new Date();
		var endDate = new Date();

		startDate.setDate(startDate.getDate() - 30);

		$.ajax({
		    url: 'https://www.strava.com/api/v3/segments/' + segments[i].id.toString() + '/all_efforts?athlete_id=' + athleteId + '&start_date_local=' + startDate.toISOString() + '&end_date_local=' + endDate.toISOString() + '&page=1&per_page=1',
			headers: {
				'Authorization': 'Bearer ' + accessToken,
				'Content-Type': 'application/json'
			},
			method: 'GET',
			dataType: 'json',
			segmentId: segments[i].id,
			success: function(data){
				var segment = getSegment(segments, this.segmentId);
				
				if (data.length == 1) {
					segment.thirtyDayBestTime(data[0].moving_time);
					segment.thirtyDayBestDate(data[0].start_date);
					segment.thirtyDayBestEffortId(data[0].id);
				}
			}
		});
	}
});