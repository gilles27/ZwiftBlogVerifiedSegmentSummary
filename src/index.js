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

var SegmentViewModel = function (id, name) {
    var self = this;
	
	self.id = id;
	self.name = name;
	self.time = ko.observable(null);
	self.date = ko.observable(null);
	self.effortId = ko.observable(null);
	self.rank = ko.observable(null);
	self.percentile = ko.observable(null);
	self.thirtyDayBestTime = ko.observable(null);
	self.thirtyDayBestDate = ko.observable(null);
	self.bestTime = ko.observable(null);
	self.bestDate = ko.observable(null);

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
	    if (self.effortId() == null) {
	        return null;
	    }
	    return 'https://www.strava.com/segment_efforts/' + self.effortId().toString();
	});
}

$(document).ready(function(){
	var accessToken = getParameterByName("accessToken");
	var athleteId = getParameterByName("athleteId");
	var segments = [
		new SegmentViewModel(12109030, 'Hilly KOM Forward'), // Red polka with mtns
		new SegmentViewModel(12128029, 'Hilly KOM Reverse'), // Red polka with mtns
		new SegmentViewModel(11596903, 'Epic KOM Forward'), // Blue polka with goat
		new SegmentViewModel(11596925, 'Epic KOM Reverse'), // Blue polka with goat
		new SegmentViewModel(12109305, 'Sprint Forward'), // Green
		new SegmentViewModel(12109228, 'Sprint Reverse'), // Green
		new SegmentViewModel(12128826, 'Libby Hill KOM'), // Red polka with mtns (no reverse)
		new SegmentViewModel(12128917, '23rd St KOM'), // No jersey?
		new SegmentViewModel(12128762, 'Monument Ave Sprint'), // Green jersey
		new SegmentViewModel(12128880, 'Broad St Sprint'), // No jersey
		new SegmentViewModel(12744502, 'Box Hill KOM'), // Red polka with mtns
		new SegmentViewModel(12744396, 'Fox Hill KOM'), // Red polka with mtns
		new SegmentViewModel(12749377, 'The Mall Sprint Forward'), // Green 
		new SegmentViewModel(12749402, 'The Mall Sprint Reverse') // Green
	];
	
	// Orange
	// F and R hilly lap Watopia
	// F London loop (bug with R)
	// F UCI Richmond (not sure about R)
	
	var viewModel = { efforts: ko.observableArray(segments) };
	
	viewModel.sortByTime = function() {
		viewModel.efforts.sort(function(left, right) {
			if (left.time() == right.time())
				return 0;
			if (left.time() < right.time())
				return -1;
			else
				return 1;
		});
	};
	
	viewModel.sortByDate = function() {
		viewModel.efforts.sort(function(left, right) {
			if (left.date() == right.date())
				return 0;
			if (left.date() < right.date())
				return -1;
			else
				return 1;
		});
	};
	
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
					segment.percentile(Math.round(athleteBest[0].rank / data.effort_count * 100.0)); // TODO Round up, i.e. 3.1 => 4.
					segment.effortId(athleteBest[0].effort_id);
				}
				segment.bestTime(overallBest.moving_time);
				segment.bestDate(overallBest.start_date);
			}
		});
		
		$.ajax({
			url: 'https://www.strava.com/api/v3/segments/' + segments[i].id.toString() + '/all_efforts?athlete_id=' + athleteId + '&start_date_local=2016-12-18T00:00:00Z&end_date_local=2017-01-17T00:00:00Z&page=1&per_page=1', // TODO Make dates dynamic
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
				}
			}
		});
	}
});